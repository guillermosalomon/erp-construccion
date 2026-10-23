'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { sincronizarIdentidad } from './identidad';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const isConfigured = isSupabaseConfigured();

  // Identidad unificada: profiles es la persona; personal (staff) o clientes (CLIENTE)
  // quedan enlazados por profile_id. Rol por defecto seguro: nunca asumir ADMIN.
  // Una sola sincronización por usuario y sesión de pestaña (evita repetir en cada refresh de token).
  const syncedRef = useRef(null);
  const syncProfile = useCallback(async (sUser) => {
    if (syncedRef.current === sUser.id) return;
    syncedRef.current = sUser.id;
    await sincronizarIdentidad(sUser);
  }, []);

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
  }, [isConfigured, syncProfile]);

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
    
    // Immediate sync for new registration — profile + personal (staff) o cliente CRM (CLIENTE), enlazados por profile_id
    // (user_metadata ya contiene la metadata del registro; syncProfile evita duplicar con onAuthStateChange)
    if (data?.user) {
      await syncProfile(data.user);
    }

    return { data };
  }, [isConfigured, syncProfile]);

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
