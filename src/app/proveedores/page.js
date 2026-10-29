import Link from 'next/link';

export const metadata = {
  title: 'Manual Red de Proveedores e Integración APU | Kalarti S.A.S.',
  description:
    'Documentación técnica y comercial para fabricantes, distribuidores y proveedores de materiales de construcción en Kalarti.',
};

export default function ProveedoresPage() {
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
        .manual-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }
        .manual-box {
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 22px;
          background: #ffffff;
        }
        .manual-box h3 {
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 8px 0;
          color: #0f172a;
        }
        .manual-box p {
          font-size: 14px;
          color: #334155;
          margin: 0;
        }
        @media (max-width: 768px) {
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
            KALARTI — RED DE PROVEEDORES
          </Link>
          <nav className="manual-nav-links">
            <Link href="/marketplace">Marketplace B2B/B2C</Link>
            <Link href="/comercio">Comercio y POS</Link>
            <Link href="/registro?tipo=proveedor" className="manual-btn-dark">
              Aplicar como Proveedor ➔
            </Link>
          </nav>
        </div>
      </header>

      <main className="manual-container">
        <div className="manual-doc-code">Manual de Afiliación B2B — Fabricantes, Distribuidores y Mayoristas</div>
        <h1 className="manual-title">Red de Proveedores e Integración con Precios APU</h1>
        <p className="manual-lead">
          Vincule su catálogo técnico de materiales, agregados, aceros, sistemas livianos o alquiler de maquinaria al
          motor de presupuestos y compras de KALARTI S.A.S. Cuando una constructora formula su presupuesto en su zona de
          cobertura, sus insumos participan directamente en las órdenes de cotización y compra.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          <Link href="/registro?tipo=proveedor" className="manual-btn-dark">
            Registrar Empresa Proveedora ➔
          </Link>
          <Link href="/comercio" className="manual-btn-outline">
            Ver Modalidad Ferretería con POS
          </Link>
        </div>

        {/* SECCIÓN 01 */}
        <section className="manual-section">
          <div className="manual-section-header">
            <span className="manual-section-num">Sección 01</span>
            <h2 className="manual-section-title">Alcance Operativo del Proveedor Afiliado</h2>
          </div>

          <div className="manual-grid-2">
            <div className="manual-box">
              <h3>01. Vinculación a Análisis de Precios Unitarios (APU)</h3>
              <p>
                Los precios unitarios de sus insumos alimentan la referencia técnica regional con la que arquitectos,
                ingenieros y constructores estructuran sus presupuestos de obra.
              </p>
            </div>
            <div className="manual-box">
              <h3>02. Recepción de Órdenes de Compra del ERP</h3>
              <p>
                Reciba solicitudes de cotización formal y órdenes de compra generadas desde el módulo de Almacén y
                Compras de los proyectos activos en su departamento.
              </p>
            </div>
            <div className="manual-box">
              <h3>03. Vitrina Comercial en Marketplace B2B/B2C</h3>
              <p>
                Publique fichas técnicas, unidades de empaque, disponibilidad de inventario y escalas de descuento por
                volumen con recaudo electrónico a través de Mercado Pago.
              </p>
            </div>
            <div className="manual-box">
              <h3>04. Cobertura Logística y Tiempos de Entrega</h3>
              <p>
                Configure los municipios atendidos, costos de flete a obra y condiciones de despacho directo en planta o
                bodega mayorista.
              </p>
            </div>
          </div>
        </section>

        {/* SECCIÓN 02 */}
        <section className="manual-section">
          <div className="manual-section-header">
            <span className="manual-section-num">Sección 02</span>
            <h2 className="manual-section-title">Diferencia entre Red de Proveedores y Comercio con POS</h2>
          </div>

          <div className="manual-grid-2">
            <div className="manual-box">
              <h3>Modalidad A — Proveedor / Distribuidor B2B</h3>
              <p style={{ marginBottom: 14 }}>
                Orientada a fabricantes, ladrilleras, concreteras, importadores y distribuidores mayoristas que desean
                publicar su lista de precios en APUs y atender órdenes de compra de obra sin requerir caja registradora
                de mostrador.
              </p>
              <Link href="/registro?tipo=proveedor" className="manual-btn-dark">
                Aplicar como Proveedor B2B ➔
              </Link>
            </div>
            <div className="manual-box">
              <h3>Modalidad B — Comercio Ferretero con POS</h3>
              <p style={{ marginBottom: 14 }}>
                Orientada a ferreterías y depósitos con atención al público en punto físico que requieren facturación en
                mostrador (POS), control de inventario multi-sede, vendedores y ventas en el Marketplace.
              </p>
              <Link href="/registro?tipo=comercio" className="manual-btn-outline">
                Aplicar a Comercio y POS ➔
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
