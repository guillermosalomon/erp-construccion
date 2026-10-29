import Link from 'next/link';
import ConvocatoriasPublicasList from '@/components/ecosistema/ConvocatoriasPublicasList';

export const metadata = {
  title: 'Manual Red de Talento y Cuadrillas | Kalarti S.A.S.',
  description:
    'Documentación de vinculación a la Red Bidireccional de Profesionales, Maestros y Cuadrillas de Construcción Kalarti.',
};

export default function UnetePage() {
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
          padding: 38px 0;
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
        .manual-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
        }
        .manual-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
        }
        .manual-box {
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 20px;
          background: #ffffff;
        }
        .manual-box h3 {
          font-size: 15px;
          font-weight: 700;
          margin: 0 0 8px 0;
          color: #0f172a;
        }
        .manual-box p {
          font-size: 13.5px;
          color: #334155;
          margin: 0;
        }
        @media (max-width: 900px) {
          .manual-grid-4 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .manual-grid-3 {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .manual-container {
            padding: 32px 18px 60px;
          }
          .manual-grid-4 {
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
            KALARTI — RED DE TALENTO
          </Link>
          <nav className="manual-nav-links">
            <Link href="/mi-portal">Portal Privado</Link>
            <Link href="/planes">Para Constructoras</Link>
            <Link href="/registro?tipo=profesional" className="manual-btn-dark">
              Aplicar a la Red ➔
            </Link>
          </nav>
        </div>
      </header>

      <main className="manual-container">
        <div className="manual-doc-code">Manual de Vinculación — Profesionales, Técnicos y Cuadrillas de Obra</div>
        <h1 className="manual-title">Red Bidireccional de Talento para la Construcción</h1>
        <p className="manual-lead">
          El registro, validación de credenciales y postulación a convocatorias en la Red de Talento Kalarti es
          completamente gratuito para profesionales y trabajadores. Su perfil técnico se enlaza directamente con los
          cargos presupuestales de las constructoras que operan en el ERP.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          <Link href="/registro?tipo=profesional" className="manual-btn-dark">
            Iniciar Registro Profesional ➔
          </Link>
          <Link href="/mi-portal" className="manual-btn-outline">
            Ingresar a Mi Portal Privado
          </Link>
        </div>

        {/* SECCIÓN 01: PERFILES ADMITIDOS */}
        <section className="manual-section">
          <div className="manual-section-header">
            <span className="manual-section-num">Sección 01</span>
            <h2 className="manual-section-title">Perfiles Técnicos y Operativos Admitidos</h2>
          </div>

          <div className="manual-grid-4">
            <div className="manual-box">
              <h3>01. Ingeniería y Arquitectura</h3>
              <p>
                Directores de obra, residentes técnicos, calculistas estructurales NSR-10, especialistas BIM 5D,
                hidrosanitarios, eléctricos e interventores con matrícula COPNIA / CPNAA vigente.
              </p>
            </div>
            <div className="manual-box">
              <h3>02. Maestros y Oficiales</h3>
              <p>
                Maestros generales de obra, oficiales de mampostería, estructura en concreto, carpintería metálica y de
                madera, estuco, pintura, enchapes y acabados arquitectónicos.
              </p>
            </div>
            <div className="manual-box">
              <h3>03. Cuadrillas Especializadas</h3>
              <p>
                Cuadrillas integradas para cimentación, estructura, redes eléctricas RETIE, plomería, impermeabilización,
                cubiertas, drywall y bioconstrucción en Guadua Angustifolia.
              </p>
            </div>
            <div className="manual-box">
              <h3>04. SST, Topografía y Control</h3>
              <p>
                Inspectores SISO / SST con licencia vigente, coordinadores de trabajo seguro en alturas, comisiones de
                topografía, almacenistas de obra y operadores de maquinaria.
              </p>
            </div>
          </div>
        </section>

        {/* SECCIÓN 02: FLUJO DE VINCULACIÓN */}
        <section className="manual-section">
          <div className="manual-section-header">
            <span className="manual-section-num">Sección 02</span>
            <h2 className="manual-section-title">Protocolo de Registro, Verificación y Contratación</h2>
          </div>

          <div className="manual-grid-3">
            <div className="manual-box">
              <h3>Paso 01 — Registro Unificado y Oficios</h3>
              <p>
                Diligencie sus datos de identificación, ciudad base y seleccione los cargos u oficios que desempeña,
                vinculados directamente al catálogo oficial de mano de obra del ERP.
              </p>
            </div>
            <div className="manual-box">
              <h3>Paso 02 — Expediente Documental y Sello Verificado</h3>
              <p>
                En su portal privado (`/mi-portal`) adjunte cédula/NIT, hoja de vida en PDF, tarjeta profesional
                (COPNIA/CONTE), afiliación ARL, curso de alturas SST y tarifa de referencia por jornal o mes.
              </p>
            </div>
            <div className="manual-box">
              <h3>Paso 03 — Postulación y Asignación en Obra</h3>
              <p>
                Active el interruptor de disponibilidad en la red para ser convocado por constructoras de su municipio o
                postúlese directamente a las vacantes abiertas con protección de datos (Ley 1581).
              </p>
            </div>
          </div>
        </section>

        {/* SECCIÓN 03: CONVOCATORIAS ABIERTAS */}
        <section className="manual-section">
          <div className="manual-section-header">
            <span className="manual-section-num">Sección 03</span>
            <h2 className="manual-section-title">Convocatorias y Vacantes de Obra Vigentes</h2>
          </div>
          <ConvocatoriasPublicasList />
        </section>
      </main>
    </div>
  );
}
