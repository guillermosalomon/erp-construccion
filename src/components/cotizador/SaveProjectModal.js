'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function SaveProjectModal({
  isOpen,
  onClose,
  proyectoData,
  onSuccess,
}) {
  const { user, register } = useAuth();

  const [tipo, setTipo] = useState('solo_guardar'); // 'contratar_obra' | 'asesoria' | 'solo_guardar'
  const [nombre, setNombre] = useState(user?.user_metadata?.nombre || '');
  const [email, setEmail] = useState(user?.email || '');
  const [telefono, setTelefono] = useState('');
  const [ciudad, setCiudad] = useState(proyectoData?.ubicacion || 'Pasto (Nariño)');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      // 1. Si no tiene sesión iniciada, registrarlo con rol CLIENTE
      if (!user) {
        if (!email || !password || password.length < 6) {
          throw new Error('Ingresa un correo válido y contraseña de al menos 6 caracteres para crear tu cuenta de cliente.');
        }

        const resReg = await register(email, password, {
          nombre,
          telefono,
          ciudad,
          role: 'CLIENTE',
        });

        if (resReg?.error) {
          throw new Error(resReg.error.message || 'Error creando la cuenta');
        }
      }

      // 2. Disparar registro de solicitud y notificación WhatsApp al equipo Kalarti
      const resSolicitud = await fetch('/api/cotizador/solicitud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          nombre,
          email,
          telefono,
          ciudad,
          mensaje,
          proyectoNombre: proyectoData.nombre,
          presupuestoTotal: proyectoData.total,
          numItems: proyectoData.items.length,
          duracionDias: proyectoData.duracionDias,
          resumenItems: proyectoData.items,
        }),
      });

      const solData = await resSolicitud.json();
      if (!resSolicitud.ok) {
        console.warn('Aviso al procesar solicitud:', solData);
      }

      onSuccess({ tipo, nombre });
      onClose();
    } catch (err) {
      console.error('Error guardando proyecto:', err);
      setErrorMsg(err.message || 'No se pudo guardar el proyecto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cot-modal-backdrop" onClick={onClose}>
      <div className="cot-modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800 }}>💾 Guardar Presupuesto</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Selector de intención */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 6, display: 'block' }}>
              ¿Qué deseas hacer con tu proyecto?
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: 10,
                background: tipo === 'contratar_obra' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: '1px solid', borderColor: tipo === 'contratar_obra' ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                cursor: 'pointer'
              }}>
                <input type="radio" name="tipoIntencion" checked={tipo === 'contratar_obra'} onChange={() => setTipo('contratar_obra')} style={{ marginTop: 3 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#10b981' }}>🏗️ Contratar Obra con Kalarti</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Deseo que un ingeniero me contacte para cotización oficial y ejecución.</div>
                </div>
              </label>

              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: 10,
                background: tipo === 'asesoria' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: '1px solid', borderColor: tipo === 'asesoria' ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                cursor: 'pointer'
              }}>
                <input type="radio" name="tipoIntencion" checked={tipo === 'asesoria'} onChange={() => setTipo('asesoria')} style={{ marginTop: 3 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#60a5fa' }}>📐 Asesoría Técnica o Interventoría</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Revisión de planos, diseño estructural NSR-10 o visita técnica.</div>
                </div>
              </label>

              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: 10,
                background: tipo === 'solo_guardar' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: '1px solid', borderColor: tipo === 'solo_guardar' ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)',
                cursor: 'pointer'
              }}>
                <input type="radio" name="tipoIntencion" checked={tipo === 'solo_guardar'} onChange={() => setTipo('solo_guardar')} style={{ marginTop: 3 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#fbbf24' }}>💾 Solo Guardar en mi Cuenta</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Podrás volver a entrar, editar o contratar más adelante.</div>
                </div>
              </label>
            </div>
          </div>

          {/* Formulario datos de cliente */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Tu Nombre Completo *</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Juan Pérez"
                style={{ width: '100%', padding: '10px', borderRadius: 8, background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>WhatsApp / Teléfono *</label>
              <input
                type="tel"
                required
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder="Ej: 317 123 4567"
                style={{ width: '100%', padding: '10px', borderRadius: 8, background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontSize: 13 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Correo Electrónico *</label>
              <input
                type="email"
                required
                disabled={!!user}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                style={{ width: '100%', padding: '10px', borderRadius: 8, background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Ciudad de la Obra</label>
              <input
                type="text"
                value={ciudad}
                onChange={e => setCiudad(e.target.value)}
                placeholder="Ej: Pasto, Cali, Bogotá"
                style={{ width: '100%', padding: '10px', borderRadius: 8, background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontSize: 13 }}
              />
            </div>
          </div>

          {!user && (
            <div>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Crea tu Contraseña para volver a acceder *</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                style={{ width: '100%', padding: '10px', borderRadius: 8, background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontSize: 13 }}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Mensaje adicional o detalles (opcional)</label>
            <textarea
              rows={2}
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
              placeholder="Ej: Terreno inclinado, deseo iniciar en dos meses..."
              style={{ width: '100%', padding: '10px', borderRadius: 8, background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontSize: 13, resize: 'none' }}
            />
          </div>

          {errorMsg && (
            <div style={{ color: '#ef4444', fontSize: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-action-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}
          >
            {loading ? 'Procesando...' : 'Confirmar y Guardar'}
          </button>
        </form>
      </div>
    </div>
  );
}
