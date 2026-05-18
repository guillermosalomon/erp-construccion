'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';

const PLANS = [
  { value: 'admin', icon: '🔑', name: 'Administrador General', desc: 'Gestión completa de proyectos, personal y finanzas', price: '$6 USD/mes', priceNote: 'Hasta 10 usuarios vinculados gratis', color: '#2563eb', bg: '#eff6ff' },
  { value: 'cuadrilla', icon: '📲', name: 'Cuadrilla / Mano de Obra', desc: 'Portal de campo para reportes y asistencia', price: 'Gratis', priceNote: '', color: '#16a34a', bg: '#f0fdf4' },
  { value: 'tienda', icon: '🛒', name: 'Tienda / Almacén', desc: 'Oferta tus productos y materiales en la plataforma', price: 'Gratis', priceNote: '', color: '#d97706', bg: '#fffbeb' },
  { value: 'operativo', icon: '🏗️', name: 'Campo (Residente/Diseñador)', desc: 'Supervisión técnica y diseño en obra', price: 'Gratis', priceNote: '', color: '#7c3aed', bg: '#f5f3ff' },
  { value: 'contabilidad', icon: '💰', name: 'Contabilidad / Finanzas', desc: 'Control financiero y nómina', price: 'Gratis', priceNote: '', color: '#0891b2', bg: '#ecfeff' },
  { value: 'bodega', icon: '📦', name: 'Bodega / Logística', desc: 'Gestión de inventario y materiales en obra', price: 'Gratis', priceNote: '', color: '#64748b', bg: '#f8fafc' },
];

export default function LoginView() {
  const { login, register, resetPassword, authError, clearError, isConfigured } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'reset'
  const [step, setStep] = useState(1); // For register: 1=account, 2=personal, 3=plan, 4=payment(admin only)
  const [paymentMethod, setPaymentMethod] = useState('');  // paypal | nu | bancolombia
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [profesion, setProfesion] = useState('');
  const [tipoDoc, setTipoDoc] = useState('CC');
  const [numDoc, setNumDoc] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [pais, setPais] = useState('Colombia');
  const [role, setRole] = useState('admin');
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
      if (step < 2) { setStep(step + 1); setLoading(false); return; }
      
      // Enviar como Lead en el último paso
      try {
        const payload = {
          nombre: nombre || 'Usuario ERP',
          email: email,
          telefono: password, // Usamos la variable password temporalmente para guardar el teléfono en el form
          ciudad: ciudad,
          servicio: role === 'admin' ? 'suscripcion_erp' : role === 'tienda' ? 'afiliado_ferreteria' : 'cliente_general',
          mensaje: `Solicitud de cuenta: ${role.toUpperCase()}`
        };

        const res = await fetch('/api/marketing/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          setMsg('✅ ¡Solicitud enviada! Un asesor te contactará por WhatsApp para activar tu cuenta.');
          setMode('login'); setStep(1); setPassword('');
        } else {
          const errData = await res.json();
          setMsg(`❌ Error: ${errData.error || 'No se pudo enviar la solicitud'}`);
        }
      } catch (err) {
        setMsg('❌ Error de conexión al enviar la solicitud.');
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

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      setMode('login');
      setStep(1);
      clearError();
      setMsg('');
    }
  };

  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.04em' };

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
        maxWidth: mode === 'register' && (step === 3 || step === 4) ? 560 : 420,
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        borderRadius: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        transition: 'max-width 0.3s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '28px 32px 20px',
          textAlign: 'center',
          background: 'transparent',
        }}>
          <img
            src="/kalarti-logo.png"
            alt="Kalarti"
            style={{
              width: 64,
              height: 64,
              marginBottom: 12,
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
        <form onSubmit={handleSubmit} style={{ padding: '20px 32px 28px' }}>
          {/* Title + Step indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#171717', margin: 0 }}>
              {mode === 'login' && 'Iniciar Sesión'}
              {mode === 'register' && `Crear Cuenta`}
              {mode === 'reset' && 'Recuperar Contraseña'}
            </h2>
            {mode === 'register' && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {Array.from({ length: role === 'admin' ? 4 : 3 }).map((_, i) => {
                  const s = i + 1;
                  return (
                    <div key={s} style={{
                      width: s === step ? 24 : 8,
                      height: 8,
                      borderRadius: 4,
                      background: s <= step ? '#2563eb' : '#e2e8f0',
                      transition: 'all 0.3s ease',
                    }} />
                  );
                })}
              </div>
            )}
          </div>

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

          {/* ═══ LOGIN MODE ═══ */}
          {mode === 'login' && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Correo electrónico</label>
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
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Contraseña</label>
                <input
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete="current-password"
                  style={{ marginTop: 6 }}
                />
              </div>
            </>
          )}

          {/* ═══ RESET MODE ═══ */}
          {mode === 'reset' && (
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Correo electrónico</label>
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
          )}

          {/* ═══ REGISTER MODE — Step 1: Datos de Contacto ═══ */}
          {mode === 'register' && step === 1 && (
            <>
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, marginBottom: 16, fontSize: 12, color: '#64748b', borderLeft: '3px solid #2563eb' }}>
                <strong>Paso 1 de 2</strong> — Información de contacto
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Nombre completo / Empresa *</label>
                <input
                  className="form-input"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre o empresa"
                  required
                  style={{ marginTop: 6 }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Correo electrónico *</label>
                <input
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  required
                  style={{ marginTop: 6 }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Teléfono / WhatsApp *</label>
                <input
                  className="form-input"
                  type="tel"
                  value={password} // re-usamos estado password para no crear uno nuevo
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="+57 300 000 0000"
                  required
                  style={{ marginTop: 6 }}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Ciudad / Ubicación *</label>
                <input
                  className="form-input"
                  type="text"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  placeholder="Ej: Bogotá"
                  required
                  style={{ marginTop: 6 }}
                />
              </div>
            </>
          )}

          {/* ═══ REGISTER MODE — Step 2: Plan/Rol ═══ */}
          {mode === 'register' && step === 2 && (
            <>
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, marginBottom: 16, fontSize: 12, color: '#64748b', borderLeft: '3px solid #2563eb' }}>
                <strong>Paso 2 de 2</strong> — ¿Qué tipo de cuenta deseas crear?
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                  { value: 'admin', icon: '🏗️', name: 'Constructores (ERP)', desc: 'Gestión de proyectos y APU', color: '#2563eb', bg: '#eff6ff' },
                  { value: 'tienda', icon: '🏪', name: 'Ferreterías (Afiliados)', desc: 'Vende tus insumos y materiales', color: '#d97706', bg: '#fffbeb' },
                  { value: 'cliente', icon: '👥', name: 'Cliente General', desc: 'Cotizaciones y Marketplace', color: '#16a34a', bg: '#f0fdf4' }
                ].map(plan => {
                  const isSelected = role === plan.value;
                  return (
                    <button
                      key={plan.value}
                      type="button"
                      onClick={() => setRole(plan.value)}
                      style={{
                        padding: '14px 12px',
                        borderRadius: 12,
                        border: isSelected ? `2px solid ${plan.color}` : '2px solid #e2e8f0',
                        background: isSelected ? plan.bg : 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {isSelected && (
                        <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: plan.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>✓</div>
                      )}
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{plan.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{plan.name}</div>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6, lineHeight: 1.3 }}>{plan.desc}</div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Submit / Next */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: 14 }}
          >
            {loading && '⏳ '}
            {mode === 'login' && (loading ? 'Entrando...' : 'Entrar')}
            {mode === 'register' && step === 1 && 'Siguiente →'}
            {mode === 'register' && step === 2 && (loading ? 'Enviando...' : '🚀 Solicitar Acceso')}
            {mode === 'reset' && (loading ? 'Enviando...' : 'Enviar Enlace')}
          </button>

          {/* Mode switches */}
          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#737373' }}>
            {mode === 'login' && (
              <>
                <button type="button" onClick={() => { setMode('register'); setStep(1); clearError(); setMsg(''); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
                  Crear una cuenta
                </button>
                <span style={{ margin: '0 8px' }}>·</span>
                <button type="button" onClick={() => { setMode('reset'); clearError(); setMsg(''); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
                  ¿Olvidaste tu contraseña?
                </button>
              </>
            )}
            {(mode === 'register' || mode === 'reset') && (
              <button type="button" onClick={handleBack} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
                ← {mode === 'register' && step > 1 ? 'Paso anterior' : 'Volver al login'}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Datalists for register */}
      <datalist id="reg-profesion-options">
        <option value="Ingeniero Civil" />
        <option value="Arquitecto" />
        <option value="Ingeniero Mecánico" />
        <option value="Ingeniero Eléctrico" />
        <option value="Maestro de Obra" />
        <option value="Topógrafo" />
        <option value="Contador" />
        <option value="Administrador de Empresas" />
        <option value="Dibujante / Modelador BIM" />
      </datalist>
      <datalist id="reg-ciudad-options">
        <option value="Bogotá" />
        <option value="Medellín" />
        <option value="Cali" />
        <option value="Barranquilla" />
        <option value="Cartagena" />
        <option value="Bucaramanga" />
        <option value="Pereira" />
        <option value="Santa Marta" />
      </datalist>
    </div>
  );
}
