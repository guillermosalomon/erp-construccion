'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function LoginView() {
  const { login, register, resetPassword, authError, clearError, isConfigured } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    clearError();

    if (mode === 'login') {
      const { error } = await login(email, password, role);
      if (!error && !isConfigured) {
        // Demo mode — login auto
      }
    } else if (mode === 'register') {
      const { error } = await register(email, password, { nombre, role });
      if (!error) {
        setMsg(isConfigured
          ? '✅ Cuenta creada. Revisa tu email para confirmar.'
          : '✅ Cuenta demo creada.');
        setMode('login');
      }
    } else if (mode === 'reset') {
      const { error } = await resetPassword(email);
      if (!error) {
        setMsg('📧 Se envió un enlace de recuperación a tu email.');
        setMode('login');
      }
    }

    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #eff6ff 0%, #f0f4f8 50%, #e0e7ff 100%)',
      padding: 16,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '32px 32px 24px',
          textAlign: 'center',
          borderBottom: '1px solid #e5e5e5',
          background: '#fafafa',
        }}>
          <img
            src="/kalarti-logo.png"
            alt="Kalarti"
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              marginBottom: 16,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#171717', letterSpacing: '-0.02em' }}>
            ERP Construcción
          </h1>
          <p style={{ fontSize: 13, color: '#737373', marginTop: 4 }}>
            Gestión de Obra y APU
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 32px 32px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: '#171717' }}>
            {mode === 'login' && 'Iniciar Sesión'}
            {mode === 'register' && 'Crear Cuenta'}
            {mode === 'reset' && 'Recuperar Contraseña'}
          </h2>

          {/* Messages */}
          {msg && (
            <div style={{
              padding: '10px 14px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              fontSize: 13,
              color: '#166534',
              marginBottom: 16,
            }}>
              {msg}
            </div>
          )}

          {authError && (
            <div style={{
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: 8,
              fontSize: 13,
              color: '#dc2626',
              marginBottom: 16,
            }}>
              {authError}
            </div>
          )}

          {/* Demo mode badge */}
          {!isConfigured && (
            <div style={{
              padding: '10px 14px',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 8,
              fontSize: 12,
              color: '#92400e',
              marginBottom: 16,
              textAlign: 'center',
            }}>
              🧪 Modo Demo — sin Supabase configurado
            </div>
          )}




          {/* Nombre (only register) */}
          {mode === 'register' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Nombre completo
              </label>
              <input
                className="form-input"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                required
                style={{ marginTop: 6 }}
              />
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Correo electrónico
            </label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
              autoComplete="email"
              style={{ marginTop: 6 }}
            />
          </div>

          {/* Password (not for reset) */}
          {mode !== 'reset' && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Contraseña
              </label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                style={{ marginTop: 6 }}
              />
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: 14 }}
          >
            {loading && '⏳ '}
            {mode === 'login' && (loading ? 'Entrando...' : 'Entrar')}
            {mode === 'register' && (loading ? 'Creando...' : 'Crear Cuenta')}
            {mode === 'reset' && (loading ? 'Enviando...' : 'Enviar Enlace')}
          </button>

          {/* Mode switches */}
          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#737373' }}>
            {mode === 'login' && (
              <>
                <button type="button" onClick={() => { setMode('register'); clearError(); setMsg(''); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
                  Crear una cuenta
                </button>
                <span style={{ margin: '0 8px' }}>·</span>
                <button type="button" onClick={() => { setMode('reset'); clearError(); setMsg(''); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
                  ¿Olvidaste tu contraseña?
                </button>
              </>
            )}
            {(mode === 'register' || mode === 'reset') && (
              <button type="button" onClick={() => { setMode('login'); clearError(); setMsg(''); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
                ← Volver al login
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
