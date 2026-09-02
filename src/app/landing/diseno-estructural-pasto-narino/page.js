'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DisenoEstructuralPastoLanding() {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    tipo_proyecto: 'Cálculo Estructural & Licencia (Curaduría Pasto)',
    ubicacion: 'Pasto / Nariño (Ipiales, Tumaco, La Unión, Catambuco)',
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
          fuente: 'Landing Diseño y Cálculo Estructural Pasto & Nariño',
          ciudad_interes: 'Pasto / Nariño',
        }),
      });

      if (res.ok) {
        setStatus({ loading: false, success: true, error: null });
        setFormData({ nombre: '', email: '', telefono: '', tipo_proyecto: 'Cálculo Estructural & Licencia (Curaduría Pasto)', ubicacion: 'Pasto / Nariño', mensaje: '' });
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
          --primary-blue: #2563eb;
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
          background: #eff6ff;
          color: #2563eb;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 700;
          border: 1px solid #dbeafe;
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
          color: #2563eb;
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
          KALARTI S.A.S.
        </Link>
        <a href="#cotizar" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>
          Cotizar en Pasto ➔
        </a>
      </header>

      {/* HERO */}
      <section className="hero-landing">
        <div>
          <span className="hero-badge">🏢 Sede Pasto — Ed. Antonella Of. 401</span>
          <h1 className="hero-h1">
            Diseño Arquitectónico, BIM & <span>Cálculo Sismo-Resistente</span> en Pasto
          </h1>
          <p className="hero-desc">
            Consultoría y construcción integral en Nariño. Memorias de cálculo bajo NSR-10 para zona de amenaza sísmica alta dirigidas por la <strong>Ing. Sandra Paz (Esp. Estructural)</strong> y coordinación arquitectónica BIM 5D por el <strong>Arq. Guillermo Salomón</strong>.
          </p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ background: '#f8fafc', padding: '12px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary-navy)' }}>Zona Sísmica Alta</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cálculo NSR-10 Avalado</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary-navy)' }}>+50 Obras</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Experiencia Regional</div>
            </div>
          </div>
        </div>

        {/* LEAD CAPTURE FORM */}
        <div className="lead-form-card" id="cotizar">
          <h3 style={{ fontSize: '19px', fontWeight: 700, marginBottom: '6px', color: 'var(--primary-navy)' }}>Cotización con Sede en Pasto</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
            Visítanos en el Edificio Antonella Of. 401 o solicita cotización inmediata.
          </p>

          {status.success ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '18px', borderRadius: '12px' }}>
              <h4 style={{ color: '#16a34a', marginBottom: '6px', fontSize: '15px' }}>¡Solicitud Recibida!</h4>
              <p style={{ fontSize: '13px', color: '#334155' }}>
                Un ingeniero de nuestra sede en Pasto se pondrá en contacto contigo en breve.
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
                  placeholder="Ej. Ing. Fernando Maya"
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
                  <option value="Cálculo Estructural & Licencia (Curaduría Pasto)">Cálculo Estructural & Curaduría (Pasto)</option>
                  <option value="Diseño Arquitectónico & BIM Revit">Diseño Arquitectónico & BIM Revit</option>
                  <option value="Bio-Construcción en Guadua / Campestre">Bio-Construcción en Guadua / Casa Campestre</option>
                  <option value="Redes Hidrosanitarias HDS & RCI">Redes Hidrosanitarias HDS & RCI</option>
                </select>
              </div>

              <div className="form-group">
                <label>Detalles del Proyecto</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Sector (ej. Morasurco, Catambuco, Ipiales) y área en m²..."
                  value={formData.mensaje}
                  onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-submit-lead" disabled={status.loading}>
                {status.loading ? 'Enviando...' : 'Cotizar Proyecto en Pasto ➔'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">📐</div>
          <h3 className="feature-title">Especialistas en Sismo-Resistencia</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Cálculo y modelación estructural bajo NSR-10 adaptado a las condiciones de suelo volcánico y alta sismicidad de Nariño.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🌿</div>
          <h3 className="feature-title">Bio-Construcción Andina</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Viviendas híbridas en Guadua Angustifolia, tapia pisada y bahareque (Casos Cabrera House y proyectos rurales en Nariño).
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🏢</div>
          <h3 className="feature-title">Acompañamiento en Curadurías</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Gestión completa de licencias de construcción, peritajes y concepto técnico ante Curadurías Urbanas de Pasto y municipios.
          </p>
        </div>
      </section>

      {/* WHATSAPP FLOAT BUTTON */}
      <a 
        href="https://wa.me/573152717932?text=Hola,%20solicito%20cotizaci%C3%B3n%20para%20dise%C3%B1o%20y%20c%C3%A1lculo%20estructural%20en%20Pasto" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="wa-float-btn"
      >
        <span>💬</span>
        <span>WhatsApp Sede Pasto</span>
      </a>
    </div>
  );
}
