'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DisenoArquitectonicoMexicoLanding() {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    tipo_proyecto: 'Eco-Villa de Lujo / Glamping Resort',
    ubicacion: 'Riviera Maya (Tulum, Cancún, Playa del Carmen, Holbox)',
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
          fuente: 'Landing Arquitectura Sostenible Riviera Maya México',
          ciudad_interes: 'Riviera Maya / México',
        }),
      });

      if (res.ok) {
        setStatus({ loading: false, success: true, error: null });
        setFormData({ nombre: '', email: '', telefono: '', tipo_proyecto: 'Eco-Villa de Lujo / Glamping Resort', ubicacion: 'Riviera Maya', mensaje: '' });
      } else {
        throw new Error('Error al enviar la solicitud');
      }
    } catch (err) {
      setStatus({ loading: false, success: false, error: err.message });
    }
  };

  return (
    <div className="landing-clean-page">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --bg-white: #ffffff;
          --bg-light: #f8fafc;
          --text-main: #0f172a;
          --text-muted: #64748b;
          --border-color: #e2e8f0;
          --primary-navy: #0f172a;
          --primary-gold: #f59e0b;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Inter', -apple-system, sans-serif;
          background-color: var(--bg-white);
          color: var(--text-main);
        }

        .lp-header {
          padding: 18px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          border-bottom: 1px solid var(--border-color);
        }

        .lp-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--primary-navy);
          font-weight: 800;
          font-size: 19px;
          text-decoration: none;
        }

        .hero-landing {
          padding: 130px 40px 70px 40px;
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 50px;
          align-items: center;
        }

        .hero-badge {
          display: inline-block;
          padding: 5px 14px;
          background: #fef3c7;
          color: #d97706;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 700;
          border: 1px solid #fde68a;
          margin-bottom: 18px;
        }

        .hero-h1 {
          font-size: 42px;
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.8px;
          margin-bottom: 18px;
          color: var(--primary-navy);
        }

        .hero-h1 span {
          color: #d97706;
        }

        .hero-desc {
          font-size: 17px;
          color: var(--text-muted);
          line-height: 1.6;
          margin-bottom: 28px;
        }

        .lead-form-card {
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.06);
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          color: var(--text-main);
          margin-bottom: 6px;
          font-weight: 600;
        }

        .form-input, .form-select, .form-textarea {
          width: 100%;
          padding: 12px 14px;
          background: var(--bg-light);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-main);
          font-size: 14px;
          outline: none;
        }

        .btn-submit-lead {
          width: 100%;
          background: var(--primary-navy);
          color: #ffffff;
          padding: 14px;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
        }

        .features-grid {
          max-width: 1200px;
          margin: 40px auto 80px auto;
          padding: 0 40px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }

        .feature-card {
          background: var(--bg-light);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 28px;
        }

        .feature-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }

        .feature-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--primary-navy);
          margin-bottom: 8px;
        }

        .wa-float-btn {
          position: fixed;
          bottom: 24px; right: 24px;
          background: #25d366;
          color: white;
          padding: 14px 22px;
          border-radius: 30px;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 10px 25px rgba(37, 211, 102, 0.35);
          z-index: 999;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        @media (max-width: 900px) {
          .hero-landing { grid-template-columns: 1fr; padding-top: 100px; }
          .hero-h1 { font-size: 30px; }
        }
      `}} />

      {/* HEADER */}
      <header className="lp-header">
        <Link href="/" className="lp-logo">
          <img src="/icon.png" alt="Kalarti Logo" style={{ width: 32, height: 32, borderRadius: 6 }} />
          KALARTI
        </Link>
        <a href="#cotizar" style={{ color: '#d97706', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>
          Cotizar Proyecto ➔
        </a>
      </header>

      {/* HERO */}
      <section className="hero-landing">
        <div>
          <span className="hero-badge">🇲🇽 México — Riviera Maya, Tulum & Cancún</span>
          <h1 className="hero-h1">
            Arquitectura Sostenible & <span>Eco-Villas de Lujo</span> en Riviera Maya
          </h1>
          <p className="hero-desc">
            Diseño arquitectónico exclusivo para proyectos boutique en Tulum, Playa del Carmen y Cancún. Especialistas en estructuras orgánicas en Guadua/Bambú, glampings A-frame, bioclimatismo tropical y recorridos 3D fotorrealistas dirigidos por el <strong>Arq. Guillermo Salomón (Esp. BIM Management)</strong>.
          </p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ background: '#f8fafc', padding: '12px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary-navy)' }}>Eco-Luxury</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Diseño Orgánico & Bambú</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary-navy)' }}>BIM 5D</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Modelado Paramétrico</div>
            </div>
          </div>
        </div>

        {/* LEAD CAPTURE FORM */}
        <div className="lead-form-card" id="cotizar">
          <h3 style={{ fontSize: '19px', fontWeight: 700, marginBottom: '6px', color: 'var(--primary-navy)' }}>Cotizar Proyecto en Riviera Maya</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
            Recibe asesoría directa con nuestro departamento de arquitectura y diseño bioclimático.
          </p>

          {status.success ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '18px', borderRadius: '12px' }}>
              <h4 style={{ color: '#16a34a', marginBottom: '6px', fontSize: '15px' }}>¡Solicitud Recibida!</h4>
              <p style={{ fontSize: '13px', color: '#334155' }}>
                Nos comunicaremos contigo vía WhatsApp en menos de 24 horas.
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
                  placeholder="Ej. Arq. Carlos Villalobos"
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
                  placeholder="+52 998 000 0000"
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
                  <option value="Eco-Villa de Lujo / Glamping Resort">Eco-Villa de Lujo / Glamping Resort</option>
                  <option value="Boutique Hotel / Resto-Bar">Hotel Boutique / Resto-Bar Tropical</option>
                  <option value="Vivienda Residencial Campestre">Vivienda Residencial Campestre</option>
                  <option value="Coordinación BIM & Renders 3D">Coordinación BIM & Visualización 3D</option>
                </select>
              </div>

              <div className="form-group">
                <label>Ubicación & Requerimientos</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Ubicación (ej. Tulum, Playa del Carmen) y área estimada en m²..."
                  value={formData.mensaje}
                  onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-submit-lead" disabled={status.loading}>
                {status.loading ? 'Enviando...' : 'Solicitar Propuesta ➔'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">🌿</div>
          <h3 className="feature-title">Estructuras Orgánicas en Bambú</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Geometrías envolventes con Guadua Angustifolia e inmunización garantizada para integrarse con la selva maya.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🏝️</div>
          <h3 className="feature-title">Bioclimatismo Tropical</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Aprovechamiento de los vientos caribeños y aleros de sombra para mantener las villas frescas de forma natural.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🖥️</div>
          <h3 className="feature-title">Renders Fotorrealistas 3D</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Visualización fotorrealista en Twinmotion para comercialización preventiva y levantamiento de capital inversionista.
          </p>
        </div>
      </section>

      {/* WHATSAPP FLOAT BUTTON */}
      <a 
        href="https://wa.me/573152717932?text=Hola,%20solicito%20cotizaci%C3%B3n%20para%20dise%C3%B1o%20arquitect%C3%B3nico%20y%20BIM%20en%20Riviera%20Maya%20M%C3%A9xico" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="wa-float-btn"
      >
        <span>💬</span>
        <span>WhatsApp Directo</span>
      </a>
    </div>
  );
}
