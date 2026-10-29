import Link from 'next/link';

export const metadata = {
  title: 'Manual Comercio Electrónico y POS Ferretero | Kalarti S.A.S.',
  description:
    'Documentación operativa del sistema POS, control de inventarios multi-bodega y tienda en el Marketplace para ferreterías.',
};

export default function ComercioPage() {
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
        .manual-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
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
          .manual-grid-3 {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .manual-container {
            padding: 32px 18px 60px;
          }
          .manual-nav {
            padding: 14px 18px;
          }
        }
      `}</style>

      <header className="manual-nav">
        <div className="manual-nav-inner">
          <Link href="/" className="manual-brand">
            KALARTI — COMERCIO Y POS
          </Link>
          <nav className="manual-nav-links">
            <Link href="/marketplace">Marketplace</Link>
            <Link href="/erp">Ingresar al POS</Link>
            <Link href="/registro?tipo=comercio" className="manual-btn-dark">
              Activar Comercio y POS ➔
            </Link>
          </nav>
        </div>
      </header>

      <main className="manual-container">
        <div className="manual-doc-code">Manual Operativo — Ferreterías, Depósitos y Centros de Materiales</div>
        <h1 className="manual-title">Sistema de Punto de Venta (POS), Inventarios y Marketplace</h1>
        <p className="manual-lead">
          Administre sus ventas de mostrador, controle existencias por sucursal y publique su catálogo en línea en una
          sola plataforma conectada directamente con la demanda de materiales de las obras en ejecución.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          <Link href="/registro?tipo=comercio" className="manual-btn-dark">
            Crear Cuenta de Comercio y POS ➔
          </Link>
          <Link href="/erp" className="manual-btn-outline">
            Ya tengo cuenta — Ir al Panel POS
          </Link>
        </div>

        {/* SECCIÓN 01 */}
        <section className="manual-section">
          <div className="manual-section-header">
            <span className="manual-section-num">Sección 01</span>
            <h2 className="manual-section-title">Módulos Incluidos en Comercio y POS</h2>
          </div>

          <div className="manual-grid-3">
            <div className="manual-box">
              <h3>01. Caja y Facturación POS</h3>
              <p>
                Búsqueda instantánea de insumos, generación de comprobantes, control de turnos de cajeros y registro de
                múltiples medios de pago en punto físico.
              </p>
            </div>
            <div className="manual-box">
              <h3>02. Inventario Multi-Sede y Kardex</h3>
              <p>
                Administración de sede principal y múltiples puntos de venta, entradas de mercancía, traslados internos,
                alertas de stock mínimo y valoración de inventario.
              </p>
            </div>
            <div className="manual-box">
              <h3>03. Sincronización con Marketplace</h3>
              <p>
                Cada producto habilitado en su bodega se publica automáticamente en el Marketplace B2B/B2C con pasarela
                de pago Mercado Pago y notificación inmediata de pedidos.
              </p>
            </div>
            <div className="manual-box">
              <h3>04. Perfiles de Vendedores y Supervisores</h3>
              <p>
                Asigne administradores de tienda, supervisores de sucursal y vendedores con permisos acotados a su
                respectivo punto de venta.
              </p>
            </div>
            <div className="manual-box">
              <h3>05. CRM Comercial y Agenda</h3>
              <p>
                Registro de clientes frecuentes, maestros de obra e ingenieros, con historial de pedidos, cotizaciones y
                seguimiento de entregas programadas.
              </p>
            </div>
            <div className="manual-box">
              <h3>06. Conexión con Presupuestos APU</h3>
              <p>
                Los precios de su ferretería se enlazan con los APUs de su municipio para captar compras directas de
                proyectos calculados en el Cotizador y el ERP.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
