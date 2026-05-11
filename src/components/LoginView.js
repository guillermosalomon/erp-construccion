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
      const maxStep = role === 'admin' ? 4 : 3;
      if (step < 3) { setStep(step + 1); setLoading(false); return; }
      if (step === 3 && role === 'admin') { setStep(4); setLoading(false); return; }
      // Final step — create account
      if (step === maxStep) {
        if (role === 'admin' && !paymentConfirmed) {
          setLoading(false);
          return;
        }
        const { error } = await register(email, password, { 
          nombre, role: role.toUpperCase(), profesion,
          tipo_documento: tipoDoc, cedula: numDoc, ciudad, pais,
          plan: role === 'admin' ? 'admin_pro' : 'free',
          metodo_pago: role === 'admin' ? paymentMethod : null,
        });
        if (!error) {
          setMsg(isConfigured ? '✅ Cuenta creada. Revisa tu email para confirmar.' : '✅ Cuenta demo creada.');
          setMode('login'); setStep(1); setPaymentConfirmed(false); setPaymentMethod('');
        }
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

          {/* ═══ REGISTER MODE — Step 1: Cuenta ═══ */}
          {mode === 'register' && step === 1 && (
            <>
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, marginBottom: 16, fontSize: 12, color: '#64748b', borderLeft: '3px solid #2563eb' }}>
                <strong>Paso 1 de 3</strong> — Credenciales de acceso
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
                  autoComplete="email"
                  style={{ marginTop: 6 }}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Contraseña *</label>
                <input
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  style={{ marginTop: 6 }}
                />
              </div>
            </>
          )}

          {/* ═══ REGISTER MODE — Step 2: Datos Personales ═══ */}
          {mode === 'register' && step === 2 && (
            <>
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, marginBottom: 16, fontSize: 12, color: '#64748b', borderLeft: '3px solid #2563eb' }}>
                <strong>Paso 2 de 3</strong> — Información personal
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Nombre completo *</label>
                <input
                  className="form-input"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre completo"
                  required
                  style={{ marginTop: 6 }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Profesión</label>
                <input
                  className="form-input"
                  type="text"
                  value={profesion}
                  onChange={(e) => setProfesion(e.target.value)}
                  placeholder="Ej: Ingeniero Civil, Arquitecto..."
                  list="reg-profesion-options"
                  style={{ marginTop: 6 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Documento de Identidad</label>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <select className="form-select" style={{ width: 85, fontSize: 11 }} value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)}>
                      <option value="CC">🇨🇴 CC</option>
                      <option value="CE">🌐 CE</option>
                      <option value="PP">✈️ PP</option>
                    </select>
                    <input className="form-input" style={{ flex: 1 }} value={numDoc} onChange={(e) => setNumDoc(e.target.value)} placeholder={tipoDoc === 'PP' ? 'Nº Pasaporte' : 'Nº Documento'} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Ciudad</label>
                  <input className="form-input" value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Ej: Bogotá" list="reg-ciudad-options" style={{ marginTop: 6 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>País</label>
                  <select className="form-select" value={pais} onChange={(e) => setPais(e.target.value)} style={{ marginTop: 6 }}>
                    <option value="Colombia">🇨🇴 Colombia</option>
                    <option value="México">🇲🇽 México</option>
                    <option value="Perú">🇵🇪 Perú</option>
                    <option value="Ecuador">🇪🇨 Ecuador</option>
                    <option value="Chile">🇨🇱 Chile</option>
                    <option value="Argentina">🇦🇷 Argentina</option>
                    <option value="Panamá">🇵🇦 Panamá</option>
                    <option value="Costa Rica">🇨🇷 Costa Rica</option>
                    <option value="Venezuela">🇻🇪 Venezuela</option>
                    <option value="España">🇪🇸 España</option>
                    <option value="Estados Unidos">🇺🇸 Estados Unidos</option>
                    <option value="Otro">🌍 Otro</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* ═══ REGISTER MODE — Step 3: Plan/Rol ═══ */}
          {mode === 'register' && step === 3 && (
            <>
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, marginBottom: 16, fontSize: 12, color: '#64748b', borderLeft: '3px solid #2563eb' }}>
                <strong>Paso 3 de 3</strong> — Selecciona tu tipo de cuenta
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {PLANS.map(plan => {
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
                      <div style={{ 
                        fontSize: 11, 
                        fontWeight: 700, 
                        color: plan.price === 'Gratis' ? '#16a34a' : '#2563eb',
                        padding: '3px 8px',
                        background: plan.price === 'Gratis' ? '#dcfce7' : '#dbeafe',
                        borderRadius: 6,
                        display: 'inline-block',
                      }}>
                        {plan.price}
                      </div>
                      {plan.priceNote && (
                        <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>{plan.priceNote}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ═══ REGISTER MODE — Step 4: Pago (Admin only) ═══ */}
          {mode === 'register' && step === 4 && (
            <>
              <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: 8, marginBottom: 16, fontSize: 12, color: '#1e40af', borderLeft: '3px solid #2563eb' }}>
                <strong>Paso 4 de 4</strong> — Método de pago · <strong>$6 USD/mes</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {[
                  { id: 'paypal', name: 'PayPal', desc: 'Pago seguro con tu cuenta PayPal', icon: '🅿️', color: '#003087', bg: '#f0f4ff', borderColor: '#a3bffa' },
                  { id: 'nu', name: 'Nu Colombia', desc: 'Débito o crédito con Nu', icon: '💜', color: '#820AD1', bg: '#faf5ff', borderColor: '#d8b4fe' },
                  { id: 'bancolombia', name: 'Bancolombia', desc: 'Transferencia o botón Bancolombia', icon: '🏦', color: '#FDDA24', bg: '#fffbeb', borderColor: '#fde68a', textColor: '#92400e' },
                ].map(pm => {
                  const isSelected = paymentMethod === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => { setPaymentMethod(pm.id); setPaymentConfirmed(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                        borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                        border: isSelected ? `2.5px solid ${pm.borderColor}` : '2px solid #e2e8f0',
                        background: isSelected ? pm.bg : 'white',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: pm.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, border: `1px solid ${pm.borderColor}` }}>{pm.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: pm.textColor || '#1e293b' }}>{pm.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{pm.desc}</div>
                      </div>
                      {isSelected && <div style={{ width: 22, height: 22, borderRadius: '50%', background: pm.color === '#FDDA24' ? '#92400e' : pm.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>✓</div>}
                    </button>
                  );
                })}
              </div>
              {paymentMethod && !paymentConfirmed && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    // Simular redirección de pago
                    const urls = {
                      paypal: 'https://www.paypal.com/paypalme/',
                      nu: 'https://nu.com.co/',
                      bancolombia: 'https://www.bancolombia.com/',
                    };
                    window.open(urls[paymentMethod], '_blank');
                    // Marcar como confirmado para permitir crear la cuenta
                    setTimeout(() => setPaymentConfirmed(true), 1000);
                  }}
                  style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: 13, marginBottom: 10, background: paymentMethod === 'paypal' ? '#003087' : paymentMethod === 'nu' ? '#820AD1' : '#FDDA24', color: paymentMethod === 'bancolombia' ? '#1e293b' : 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
                >
                  💳 Ir a pagar con {paymentMethod === 'paypal' ? 'PayPal' : paymentMethod === 'nu' ? 'Nu' : 'Bancolombia'}
                </button>
              )}
              {paymentConfirmed && (
                <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, color: '#166534', marginBottom: 12, textAlign: 'center' }}>
                  ✅ Pago procesado. Ahora puedes crear tu cuenta.
                </div>
              )}
            </>
          )}

          {/* Submit / Next */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || (mode === 'register' && step === 4 && !paymentConfirmed)}
            style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: 14, opacity: (mode === 'register' && step === 4 && !paymentConfirmed) ? 0.5 : 1 }}
          >
            {loading && '⏳ '}
            {mode === 'login' && (loading ? 'Entrando...' : 'Entrar')}
            {mode === 'register' && step < 3 && 'Siguiente →'}
            {mode === 'register' && step === 3 && role === 'admin' && 'Siguiente → Pago'}
            {mode === 'register' && step === 3 && role !== 'admin' && (loading ? 'Creando...' : '🚀 Crear Cuenta')}
            {mode === 'register' && step === 4 && (loading ? 'Creando...' : '🚀 Crear Cuenta')}
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
