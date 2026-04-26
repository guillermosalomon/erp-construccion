'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const isConfigured = isSupabaseConfigured();

  // Listen for auth state changes
  useEffect(() => {
    if (!isConfigured) {
      // No Supabase → modo demo sin auth
      setUser({ id: 'demo', email: 'demo@erp-construccion.local', demo: true });
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      const sUser = s?.user ?? null;
      setUser(sUser);
      if (sUser && !sUser.demo) syncProfile(sUser);
    });

    return () => subscription.unsubscribe();
  }, [isConfigured]);

  const syncProfile = async (sUser) => {
    try {
      // 1. Sync to profiles table
      const { data: profileData, error: profileErr } = await supabase.from('profiles').select('id').eq('id', sUser.id).maybeSingle();
      if (!profileData && !profileErr) {
        await supabase.from('profiles').upsert({
          id: sUser.id,
          email: sUser.email,
          nombre: sUser.user_metadata?.nombre || sUser.email.split('@')[0],
          role: sUser.user_metadata?.role || 'ADMIN'
        }, { onConflict: 'id' });
      }

      // 2. Sync to personal table (so the user appears in the Personnel admin view)
      const { data: personalData } = await supabase.from('personal').select('id').eq('email', sUser.email).maybeSingle();
      if (!personalData) {
        const nombreCompleto = sUser.user_metadata?.nombre || sUser.email.split('@')[0];
        const parts = nombreCompleto.split(' ');
        await supabase.from('personal').insert({
          email: sUser.email,
          nombre: nombreCompleto,
          nombres: parts[0] || '',
          apellidos: parts.slice(1).join(' ') || '',
          profesion: sUser.user_metadata?.profesion || '',
          app_role: sUser.user_metadata?.role || 'ADMIN',
          user_id: sUser.id
        });
      }
    } catch (e) {
      console.warn('Sync Profile error (non-blocking):', e);
    }
  };

  // ── Login ──
  const login = useCallback(async (email, password, role = 'ADMIN') => {
    setAuthError(null);
    if (!isConfigured) {
      setUser({ id: 'demo' + (role === 'CUADRILLA' ? '-cuadrilla' : ''), email, demo: true, user_metadata: { role } });
      return { error: null };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      return { error };
    }
    return { data };
  }, [isConfigured]);

  // ── Register ──
  const register = useCallback(async (email, password, metadata = {}) => {
    setAuthError(null);
    if (!isConfigured) {
      setUser({ id: 'demo' + (metadata.role === 'CUADRILLA' ? '-cuadrilla' : ''), email, demo: true, user_metadata: metadata });
      return { error: null };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) {
      setAuthError(error.message);
      return { error };
    }
    
    // Immediate sync for new registration — create profile + personal
    if (data?.user) {
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          nombre: metadata.nombre || data.user.email.split('@')[0],
          role: metadata.role || 'ADMIN'
        }, { onConflict: 'id' });

        // Also create a personal entry
        const nombreCompleto = metadata.nombre || data.user.email.split('@')[0];
        const parts = nombreCompleto.split(' ');
        await supabase.from('personal').insert({
          email: data.user.email,
          nombre: nombreCompleto,
          nombres: parts[0] || '',
          apellidos: parts.slice(1).join(' ') || '',
          profesion: metadata.profesion || '',
          app_role: metadata.role || 'ADMIN',
          user_id: data.user.id
        });
      } catch (e) {
        console.warn('Error creating profile/personal on register:', e);
      }
    }

    return { data };
  }, [isConfigured]);

  // ── Logout ──
  const logout = useCallback(async () => {
    if (!isConfigured) {
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, [isConfigured]);

  // ── Reset password ──
  const resetPassword = useCallback(async (email) => {
    setAuthError(null);
    if (!isConfigured) return { error: null };
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) setAuthError(error.message);
    return { error };
  }, [isConfigured]);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      authError,
      isConfigured,
      isDemo: user?.demo === true,
      login,
      register,
      logout,
      resetPassword,
      clearError: () => setAuthError(null),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
