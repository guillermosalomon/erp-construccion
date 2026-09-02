'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function BioConstruccionEjeCafeteroLanding() {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    tipo_proyecto: 'Glamping / Eco-turismo',
    ubicacion: 'Eje Cafetero',
    mensaje: '',
  });

  const [status, setStatus] = useState({ loading: false, success: false, error: null });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, success: false, error: null });

    try {
      const res = await fetch('/api/marketing/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fuente: 'Landing Bio-Construcción Eje Cafetero',
          ciudad_interes: 'Eje Cafetero (Pereira/Manizales/Armenia)',
        }),
      });

      if (res.ok) {
        setStatus({ loading: false, success: true, error: null });
        setFormData({ nombre: '', email: '', telefono: '', tipo_proyecto: 'Glamping / Eco-turismo', ubicacion: 'Eje Cafetero', mensaje: '' });
      } else {
        throw new Error('Error al registrar la solicitud');
      }
    } catch (err) {
      setStatus({ loading: false, success: false, error: err.message });
    }
  };

  return (
    <div className="landing-bio-page">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --navy-900: #0f172a;
          --navy-800: #1e293b;
          --gold-500: #f59e0b;
          --gold-400: #fbbf24;
          --text-light: #f8fafc;
          --text-muted: #94a3b8;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Inter', -apple-system, sans-serif;
          background-color: var(--navy-900);
          color: var(--text-light);
        }

        .lp-header {
          padding: 20px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(10px);
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .lp-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
          font-weight: 800;
          font-size: 20px;
          text-decoration: none;
        }

        .hero-landing {
          padding: 140px 40px 80px 40px;
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 440px;
          gap: 60px;
          align-items: center;
        }

        .hero-badge {
          display: inline-block;
          padding: 6px 16px;
          background: rgba(245, 158, 11, 0.1);
          color: var(--gold-400);
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          border: 1px solid rgba(245, 158, 11, 0.2);
          margin-bottom: 20px;
        }

        .hero-h1 {
          font-size: 46px;
          font-weight: 800;
          line-height: 1.15;
          margin-bottom: 20px;
        }

        .hero-h1 span {
          color: var(--gold-400);
        }

        .hero-desc {
          font-size: 18px;
          color: var(--text-muted);
          line-height: 1.6;
          margin-bottom: 30px;
        }

        .lead-form-card {
          background: rgba(30, 41, 59, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }

        .form-group {
          margin-bottom: 18px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          color: var(--text-muted);
          margin-bottom: 6px;
          font-weight: 600;
        }

        .form-input, .form-select, .form-textarea {
          width: 100%;
          padding: 12px 16px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          color: white;
          font-size: 14px;
          outline: none;
        }

        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: var(--gold-400);
        }

        .btn-submit-lead {
          width: 100%;
          background: var(--gold-500);
          color: var(--navy-900);
          padding: 14px;
          border: none;
          border-radius: 8px;
          font-weight: 800;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-submit-lead:hover {
          background: var(--gold-400);
        }

        .features-grid {
          max-width: 1200px;
          margin: 60px auto;
          padding: 0 40px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
        }

        .feature-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 30px;
        }

        .feature-icon {
          font-size: 36px;
          margin-bottom: 16px;
        }

        .feature-title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 10px;
        }

        .wa-float-btn {
          position: fixed;
          bottom: 24px; right: 24px;
          background: #25d366;
          color: white;
          padding: 14px 24px;
          border-radius: 30px;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 10px 25px rgba(37, 211, 102, 0.4);
          z-index: 999;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        @media (max-width: 900px) {
          .hero-landing { grid-template-columns: 1fr; padding-top: 100px; }
          .hero-h1 { font-size: 32px; }
        }
      `}} />

      {/* HEADER */}
      <header className="lp-header">
        <Link href="/" className="lp-logo">
          <img src="/icon.png" alt="Kalarti Logo" style={{ width: 36, height: 36, borderRadius: 8 }} />
          KALARTI
        </Link>
        <a href="#cotizar" style={{ color: 'var(--gold-400)', textDecoration: 'none', fontWeight: 600 }}>
          Solicitar Cotización ➔
        </a>
      </header>

      {/* HERO */}
      <section className="hero-landing">
        <div>
          <span className="hero-badge">🌿 Bio-Construcción & Guadua Angustifolia</span>
          <h1 className="hero-h1">
            Diseño y Construcción en <span>Guadua y Materiales Orgánicos</span> para el Eje Cafetero
          </h1>
          <p className="hero-desc">
            Especialistas en Glampings A-frame, casas campestres en Guadua Angustifolia Kunth, muros mixtos de tierra y arquitectura bioclimática sismo-resistente en Pereira, Manizales y Armenia.
          </p>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gold-400)' }}>100%</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sismo-Resistente NSR-10</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gold-400)' }}>+50</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Proyectos Ejecutados</div>
            </div>
          </div>
        </div>

        {/* LEAD CAPTURE FORM */}
        <div className="lead-form-card" id="cotizar">
          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Solicitar Cotización Gratis</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Recibe asesoría directa con el Arq. Guillermo Salomón para tu proyecto en el Eje Cafetero.
          </p>

          {status.success ? (
            <div style={{ background: 'rgba(37, 211, 102, 0.15)', border: '1px solid #25d366', padding: '20px', borderRadius: '12px', textStyle: 'center' }}>
              <h4 style={{ color: '#25d366', marginBottom: '8px' }}>¡Solicitud Recibida!</h4>
              <p style={{ fontSize: '14px', color: 'white' }}>
                Nos pondremos en contacto contigo vía WhatsApp en menos de 24 horas.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre Completo *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ej. Carlos Mendoza"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Teléfono / WhatsApp *</label>
                <input
                  type="tel"
                  required
                  className="form-input"
                  placeholder="+57 300 000 0000"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Tipo de Proyecto</label>
                <select
                  className="form-select"
                  value={formData.tipo_proyecto}
                  onChange={(e) => setFormData({ ...formData, tipo_proyecto: e.target.value })}
                >
                  <option value="Glamping / Eco-turismo">Glamping / Proyecto Eco-turístico</option>
                  <option value="Casa Finca / Campestre">Casa Finca / Vivienda Campestre</option>
                  <option value="Kiosco / Estructura Comercial">Kiosco / Estructura Comercial</option>
                  <option value="Asesoría Estructural Guadua">Asesoría / Memorias de Cálculo Guadua</option>
                </select>
              </div>

              <div className="form-group">
                <label>Mensaje Breve</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Describe brevemente el área estimada o municipio (ej. Pereira, Salento, Armenia)..."
                  value={formData.mensaje}
                  onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                />
              </div>

              {status.error && (
                <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{status.error}</p>
              )}

              <button type="submit" className="btn-submit-lead" disabled={status.loading}>
                {status.loading ? 'Enviando...' : 'Enviar Solicitud ➔'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">🎋</div>
          <h3 className="feature-title">Guadua Inmunizada con Sales de Boro</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Inmunización ecológica por difusión vertical al 4% de Ácido Bórico y Bórax para asegurar una vida útil superior a 50 años.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📐</div>
          <h3 className="feature-title">Cumplimiento NSR-10 Título E</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Diseño estructural con cálculo de uniones empernadas, arriostramientos y columnas compuestas para máxima sismo-resistencia.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🏡</div>
          <h3 className="feature-title">Muros Mixtos de Tierra y Vegetación</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Combinación bioclimática de bahareque encementado, tapia pisada e inercia térmica pasiva para confort térmico óptimo.
          </p>
        </div>
      </section>

      {/* WHATSAPP FLOAT BUTTON */}
      <a 
        href="https://wa.me/573152717932?text=Hola,%20solicito%20cotizaci%C3%B3n%20para%20dise%C3%B1o%20y%20bio-construcci%C3%B3n%20en%20guadua%20en%20el%20Eje%20Cafetero" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="wa-float-btn"
      >
        <span>💬</span>
        <span>Cotizar por WhatsApp</span>
      </a>
    </div>
  );
}
