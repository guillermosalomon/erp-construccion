'use client';

import Link from 'next/link';

export default function PublicarInmueblePage() {
  return (
    <div className="manual-page">
      <style>{`
        .manual-page {
          min-height: 100vh;
          background: #ffffff;
          color: #0f172a;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          line-height: 1.65;
        }
        .manual-nav {
          border-bottom: 1px solid #e2e8f0;
          background: #ffffff;
          position: sticky;
          top: 0;
          z-index: 40;
          padding: 16px 28px;
        }
        .manual-nav-inner {
          max-width: 1120px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
        }
        .manual-brand {
          font-weight: 800;
          font-size: 15px;
          letter-spacing: 0.08em;
          color: #0f172a;
          text-decoration: none;
        }
        .manual-nav-links {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          font-size: 13px;
        }
        .manual-nav-links a {
          color: #475569;
          text-decoration: none;
          font-weight: 500;
        }
        .manual-nav-links a:hover {
          color: #0f172a;
        }
        .manual-btn-dark {
          background: #0f172a;
          color: #ffffff !important;
          padding: 8px 16px;
          border-radius: 4px;
          font-weight: 600;
          text-decoration: none;
          display: inline-block;
        }
        .manual-btn-outline {
          background: #ffffff;
          color: #0f172a;
          border: 1px solid #0f172a;
          padding: 8px 16px;
          border-radius: 4px;
          font-weight: 600;
          text-decoration: none;
          display: inline-block;
        }
        .manual-container {
          max-width: 1120px;
          margin: 0 auto;
          padding: 48px 28px 80px;
        }
        .manual-doc-code {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #64748b;
          margin-bottom: 10px;
        }
        .manual-title {
          font-size: clamp(26px, 3.6vw, 40px);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #0f172a;
          margin: 0 0 16px 0;
          line-height: 1.2;
        }
        .manual-lead {
          font-size: 16px;
          color: #334155;
          max-width: 820px;
          margin: 0 0 32px 0;
        }
        .manual-section {
          border-top: 1px solid #e2e8f0;
          padding: 40px 0;
        }
        .manual-section-header {
          display: flex;
          align-items: baseline;
          gap: 14px;
          margin-bottom: 20px;
        }
        .manual-section-num {
          font-size: 12px;
          font-weight: 800;
          color: #64748b;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .manual-section-title {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .manual-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 28px;
        }
        .manual-card {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 28px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .manual-tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #0f172a;
          background: #f1f5f9;
          padding: 4px 10px;
          border-radius: 3px;
          margin-bottom: 14px;
        }
        .manual-rate {
          font-size: 30px;
          font-weight: 800;
          color: #0f172a;
          margin: 10px 0 4px;
        }
        .manual-rate-sub {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 18px;
        }
        .manual-list {
          padding-left: 18px;
          margin: 0 0 24px 0;
          color: #334155;
          font-size: 14px;
        }
        .manual-list li {
          margin-bottom: 10px;
        }
        .manual-table-wrap {
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
        }
        .manual-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
          text-align: left;
        }
        .manual-table th {
          background: #f8fafc;
          color: #0f172a;
          font-weight: 700;
          padding: 14px 16px;
          border-bottom: 1px solid #e2e8f0;
        }
        .manual-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
          vertical-align: top;
        }
        @media (max-width: 820px) {
          .manual-container {
            padding: 32px 18px 60px;
          }
          .manual-grid-2 {
            grid-template-columns: 1fr;
          }
          .manual-nav {
            padding: 14px 18px;
          }
        }
      `}</style>

      <header className="manual-nav">
        <div className="manual-nav-inner">
          <Link href="/" className="manual-brand">
            KALARTI — DOCUMENTACIÓN DE VINCULACIÓN
          </Link>
          <nav className="manual-nav-links">
            <Link href="/propiedades">Portafolio de Inmuebles</Link>
            <Link href="/mi-portal">Portal Privado</Link>
            <Link href="/registro?tipo=inmueble" className="manual-btn-dark">
              Publicar Inmueble ➔
            </Link>
          </nav>
        </div>
      </header>

      <main className="manual-container">
        <div className="manual-doc-code">Manual Operativo y Contractual — Eje Inmobiliario (Ley 1581 de 2012)</div>
        <h1 className="manual-title">Publicación de Inmuebles, Corretaje y Gestión CRM</h1>
        <p className="manual-lead">
          El módulo inmobiliario de KALARTI S.A.S. opera bajo dos regímenes diferenciados según la naturaleza del
          anunciante, garantizando el aislamiento técnico de la información privada de propietarios, carteras de
          clientes y prospectos comerciales.
        </p>

        {/* SECCIÓN 01: LAS DOS MODALIDADES */}
        <section className="manual-section">
          <div className="manual-section-header">
            <span className="manual-section-num">Sección 01</span>
            <h2 className="manual-section-title">Modalidades de Publicación y Estructura de Comisiones</h2>
          </div>

          <div className="manual-grid-2">
            {/* MODALIDAD PARTICULAR */}
            <div className="manual-card">
              <div>
                <span className="manual-tag">Modalidad A — Propietario Particular</span>
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px 0' }}>
                  Consignación Asistida con Corredores Kalarti
                </h3>
                <div className="manual-rate">3.0%</div>
                <div className="manual-rate-sub">
                  Comisión única causada exclusivamente sobre el valor de venta efectiva al cierre del negocio.
                </div>
                <p style={{ fontSize: 14, color: '#334155', marginBottom: 16 }}>
                  Diseñada para personas naturales o propietarios directos que desean vender su lote, apartamento, casa
                  o local comercial con el respaldo técnico, normativo y comercial de KALARTI S.A.S.
                </p>
                <ul className="manual-list">
                  <li>
                    <strong>Asesoría Técnica y Normativa:</strong> Evaluación del potencial constructivo (POT / NSR-10) y
                    estructuración de la ficha comercial del predio.
                  </li>
                  <li>
                    <strong>Impulso Comercial con Corredores Propios:</strong> Nuestro equipo de corredores gestiona la
                    promoción, calificación de interesados y programación de visitas.
                  </li>
                  <li>
                    <strong>Seguimiento Integral de Leads:</strong> Todos los prospectos recibidos se registran y
                    gestionan en el CRM corporativo hasta la firma de promesa de compraventa.
                  </li>
                  <li>
                    <strong>Reserva de Identidad del Propietario:</strong> Los teléfonos, correos, documento de
                    identidad y matrícula inmobiliaria del propietario permanecen ocultos al público general.
                  </li>
                </ul>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href="/registro?tipo=inmueble&subtipo=particular" className="manual-btn-dark">
                  Aplicar como Propietario Particular (3%) ➔
                </Link>
              </div>
            </div>

            {/* MODALIDAD INMOBILIARIA */}
            <div className="manual-card">
              <div>
                <span className="manual-tag">Modalidad B — Inmobiliarias y Agencias</span>
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px 0' }}>
                  Plataforma Inmobiliaria, CRM y Red de Corredores
                </h3>
                <div className="manual-rate">0.3%</div>
                <div className="manual-rate-sub">
                  Comisión tecnológica por venta cerrada a través del ecosistema Kalarti.
                </div>
                <p style={{ fontSize: 14, color: '#334155', marginBottom: 16 }}>
                  Diseñada para firmas inmobiliarias constituidas que administran portafolios de terceros, cuentan con
                  su propia fuerza de ventas y requieren un entorno CRM aislado de alto rendimiento.
                </p>
                <ul className="manual-list">
                  <li>
                    <strong>Administración Autónoma de Inmuebles:</strong> Publicación, edición y control de estado de
                    toda su cartera inmobiliaria en sincronización directa con el catálogo web.
                  </li>
                  <li>
                    <strong>Creación de Múltiples Perfiles de Corredores:</strong> Registro ilimitado de corredores
                    adscritos a su agencia, con asignación individual por inmueble y porcentaje de comisión interna.
                  </li>
                  <li>
                    <strong>CRM Privado de Seguimiento de Prospectos:</strong> Embudo comercial completo (Nuevo,
                    Contactado, Visita Programada, Propuesta, Cierre Ganado) exclusivo para su organización.
                  </li>
                  <li>
                    <strong>Aislamiento Multi-Tenant (RLS):</strong> Ninguna otra inmobiliaria ni tercero tiene acceso a
                    su base de propietarios, corredores ni prospectos comerciales.
                  </li>
                </ul>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href="/registro?tipo=inmueble&subtipo=inmobiliaria" className="manual-btn-dark">
                  Aplicar como Inmobiliaria (0.3%) ➔
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN 02: MATRIZ CONTRACTUAL Y DE PRIVACIDAD */}
        <section className="manual-section">
          <div className="manual-section-header">
            <span className="manual-section-num">Sección 02</span>
            <h2 className="manual-section-title">Matriz Comparativa Funcional, Contractual y de Privacidad</h2>
          </div>

          <div className="manual-table-wrap">
            <table className="manual-table">
              <thead>
                <tr>
                  <th>Criterio Operativo / Contractual</th>
                  <th>Propietario Particular (3.0%)</th>
                  <th>Inmobiliaria / Agencia (0.3%)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Naturaleza del Vínculo</strong></td>
                  <td>Mandato de corretaje comercial no exclusivo y promoción asistida por Kalarti.</td>
                  <td>Afiliación tecnológica SaaS e intermediación en marketplace inmobiliario.</td>
                </tr>
                <tr>
                  <td><strong>Comisión sobre Venta Efectiva</strong></td>
                  <td>3.0% sobre el valor final de cierre de la compraventa.</td>
                  <td>0.3% sobre el valor final de cierre originado en la plataforma.</td>
                </tr>
                <tr>
                  <td><strong>Atención de Prospectos (Leads)</strong></td>
                  <td>Ejecutada directamente por los corredores internos de KALARTI S.A.S.</td>
                  <td>Ejecutada directamente por los corredores propios de la inmobiliaria en su CRM.</td>
                </tr>
                <tr>
                  <td><strong>Perfiles de Corredores</strong></td>
                  <td>Se asigna un corredor oficial de Kalarti para acompañar todo el proceso.</td>
                  <td>La inmobiliaria crea y administra múltiples perfiles de corredores propios.</td>
                </tr>
                <tr>
                  <td><strong>Aislamiento y Privacidad (Ley 1581)</strong></td>
                  <td>Datos del propietario cifrados y ocultos en la vista pública; solo visibles para administración Kalarti.</td>
                  <td>Aislamiento estricto por organización (`organizacion_id`): cartera, propietarios y CRM privados.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* SECCIÓN 03: PROCEDIMIENTO DE PUBLICACIÓN */}
        <section className="manual-section">
          <div className="manual-section-header">
            <span className="manual-section-num">Sección 03</span>
            <h2 className="manual-section-title">Procedimiento Paso a Paso para Publicar</h2>
          </div>

          <div className="manual-grid-2">
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                01. Registro e Identificación Contractual
              </h3>
              <p style={{ fontSize: 14, color: '#334155', margin: '0 0 18px 0' }}>
                Seleccione en el formulario de registro si actúa como Propietario Particular (3%) o como Inmobiliaria
                (0.3%) y acepte expresamente la cláusula de comisión al éxito y la política de tratamiento de datos
                personales (Ley 1581 de 2012).
              </p>

              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                02. Carga de Ficha Técnica y Material Fotográfico
              </h3>
              <p style={{ fontSize: 14, color: '#334155', margin: 0 }}>
                Desde su Portal Privado (`/mi-portal`) o desde el módulo de Inmuebles del ERP, registre la ubicación,
                áreas, precio, descripción técnica, planos y fotografías del inmueble.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                03. Asignación de Corredores y Activación en Catálogo
              </h3>
              <p style={{ fontSize: 14, color: '#334155', margin: '0 0 18px 0' }}>
                En la modalidad particular, Kalarti asigna un corredor especializado e impulsa la pauta del predio. En
                la modalidad inmobiliaria, la agencia vincula a cualquiera de sus corredores registrados.
              </p>

              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                04. Gestión del Embudo de Prospectos (CRM)
              </h3>
              <p style={{ fontSize: 14, color: '#334155', margin: 0 }}>
                Cada solicitud de información o visita recibida en `/propiedades` se enruta automáticamente al CRM
                correspondiente, registrando fecha, datos del interesado, etapa de negociación y oferta económica.
              </p>
            </div>
          </div>

          <div style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Link href="/registro?tipo=inmueble&subtipo=particular" className="manual-btn-dark">
              Publicar como Particular (Comisión 3%) ➔
            </Link>
            <Link href="/registro?tipo=inmueble&subtipo=inmobiliaria" className="manual-btn-outline">
              Registrar Inmobiliaria y Corredores (Comisión 0.3%) ➔
            </Link>
            <Link href="/" className="manual-btn-outline" style={{ borderColor: '#cbd5e1', color: '#475569' }}>
              Volver al Inicio
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
