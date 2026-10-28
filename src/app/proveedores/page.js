import Link from 'next/link';

export const metadata = {
  title: 'Sé Proveedor Kalarti — Afiliados Marketplace B2B | KALARTI',
  description:
    'Afilia tu fábrica, distribuidora o depósito de materiales al Marketplace Kalarti y vincula tus precios a los APUs de presupuestos en tu zona.',
};

export default function ProveedoresPage() {
  const beneficios = [
    {
      icon: '📐',
      title: 'Vinculación Directa a APUs por Zona',
      desc: 'Tus precios alimentan automáticamente los Análisis de Precios Unitarios (APU) cuando una constructora o cliente cotiza una obra en tu municipio.',
    },
    {
      icon: '🛒',
      title: 'Órdenes de Compra B2B y B2C',
      desc: 'Recibe pedidos directos desde las explosiones de insumos de los proyectos activos en el ERP y ventas de mostrador en el Marketplace con Mercado Pago.',
    },
    {
      icon: '🚚',
      title: 'Logística y Despacho Directo a Obra',
      desc: 'Configura tus zonas de cobertura, tiempos de entrega y tarifas de flete para abastecer bodegas de obra sin intermediarios.',
    },
    {
      icon: '📊',
      title: 'Catálogo Estandarizado',
      desc: 'Homologa tus referencias con los +800 insumos técnicos del catálogo Kalarti (aceros por calibre, cementos, agregados, tuberías CPVC/PVC y acabados).',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#050b16', color: '#f8fafc', fontFamily: 'var(--font-inter), sans-serif' }}>
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1200, margin: '0 auto' }}>
        <Link href="/" style={{ color: '#f8fafc', textDecoration: 'none', fontWeight: 900, fontSize: 20 }}>
          KALARTI <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 700 }}>PROVEEDORES & AFILIADOS</span>
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/marketplace" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: 13, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)' }}>
            Ver Marketplace
          </Link>
          <Link href="/registro?tipo=proveedor" style={{ background: '#f59e0b', color: '#0f172a', textDecoration: 'none', fontWeight: 800, fontSize: 13, padding: '8px 16px', borderRadius: 8 }}>
            Afiliarme como Proveedor ➔
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 1140, margin: '0 auto', padding: '56px 24px 80px' }}>
        <section style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '6px 14px', borderRadius: 999, marginBottom: 14 }}>
            🏭 Fabricantes · Distribuidores · Ladrilleras · Trituradoras · Alquiler de Equipos
          </span>
          <h1 style={{ fontSize: 'clamp(28px, 4.5vw, 48px)', fontWeight: 900, lineHeight: 1.15, margin: '0 auto 16px', maxWidth: 820 }}>
            Conecta tu catálogo de insumos directamente con los presupuestos de obra
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 16, maxWidth: 680, margin: '0 auto 28px', lineHeight: 1.6 }}>
            En Kalarti, cada presupuesto genera una explosión exacta de materiales. Al afiliarte como proveedor, tus productos aparecen como opción de compra inmediata para los residentes y directores de obra.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/registro?tipo=proveedor" style={{ background: '#f59e0b', color: '#0f172a', fontWeight: 800, fontSize: 15, padding: '14px 26px', borderRadius: 10, textDecoration: 'none' }}>
              Registrar mi Empresa Proveedora ➔
            </Link>
            <Link href="/comercio" style={{ background: 'rgba(255,255,255,0.06)', color: '#f8fafc', fontWeight: 700, fontSize: 15, padding: '14px 24px', borderRadius: 10, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}>
              ¿Tienes ferretería con mostrador? Ver POS ➔
            </Link>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 18 }}>
          {beneficios.map((b, i) => (
            <div key={i} style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(245, 158, 11, 0.22)', borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{b.icon}</div>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 8, color: '#f8fafc' }}>{b.title}</h2>
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.55, margin: 0 }}>{b.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
