'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function CalculoEstructuraBogotaLanding() {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    tipo_proyecto: 'Edificación Residencial / Comercial',
    ubicacion: 'Bogotá / Sabana',
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
          fuente: 'Landing Cálculo Estructural Bogotá',
          ciudad_interes: 'Bogotá y Sabana',
        }),
      });

      if (res.ok) {
        setStatus({ loading: false, success: true, error: null });
        setFormData({ nombre: '', email: '', telefono: '', tipo_proyecto: 'Edificación Residencial / Comercial', ubicacion: 'Bogotá / Sabana', mensaje: '' });
      } else {
        throw new Error('Error al registrar la solicitud');
      }
    } catch (err) {
      setStatus({ loading: false, success: false, error: err.message });
    }
  };

  return (
    <div className="landing-bogota-page">
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
          font-size: 44px;
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
          <span className="hero-badge">🏛️ Bogotá & Sabana — NSR-10 & Curadurías</span>
          <h1 className="hero-h1">
            Cálculo Estructural y <span>Memorias para Curadurías</span> en Bogotá
          </h1>
          <p className="hero-desc">
            Diseño estructural sismo-resistente bajo norma NSR-10 para proyectos residenciales, comerciales e industriales en Bogotá, Chía, Cajicá y la Sabana. Aval técnico garantizado para radicación de licencias.
          </p>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gold-400)' }}>100%</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cumplimiento NSR-10</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gold-400)' }}>Curadurías</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Memorias Aprobadas</div>
            </div>
          </div>
        </div>

        {/* LEAD CAPTURE FORM */}
        <div className="lead-form-card" id="cotizar">
          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Solicitar Cotización de Cálculo</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Recibe cotización rápida para tus memorias de cálculo y planos estructurales en Bogotá.
          </p>

          {status.success ? (
            <div style={{ background: 'rgba(37, 211, 102, 0.15)', border: '1px solid #25d366', padding: '20px', borderRadius: '12px' }}>
              <h4 style={{ color: '#25d366', marginBottom: '8px' }}>¡Solicitud Recibida!</h4>
              <p style={{ fontSize: '14px', color: 'white' }}>
                Un ingeniero especialista se pondrá en contacto contigo en menos de 24 horas.
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
                  placeholder="Ej. Ing. Andrés Restrepo"
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
                  <option value="Edificación Residencial / Comercial">Edificación Residencial / Comercial</option>
                  <option value="Vivienda Unifamiliar / Bifamiliar">Vivienda Unifamiliar / Bifamiliar</option>
                  <option value="Bodega / Estructura Metálica">Bodega / Estructura Metálica</option>
                  <option value="Revisión Estructural Curaduría">Revisión / Peritaje para Curaduría</option>
                </select>
              </div>

              <div className="form-group">
                <label>Mensaje Breve</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Área estimada en m² y ubicación (ej. Chía, Usaquén, Suba)..."
                  value={formData.mensaje}
                  onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-submit-lead" disabled={status.loading}>
                {status.loading ? 'Enviando...' : 'Cotizar Cálculo Estructural ➔'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* WHATSAPP FLOAT BUTTON */}
      <a 
        href="https://wa.me/573152717932?text=Hola,%20solicito%20cotizaci%C3%B3n%20para%20c%C3%A1lculo%20estructural%20y%20memorias%20en%20Bogot%C3%A1" 
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
