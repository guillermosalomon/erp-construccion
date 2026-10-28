import Link from 'next/link';

export const metadata = {
  title: 'Comercio Electrónico y POS para Ferreterías | KALARTI',
  description:
    'Administra tu ferretería o depósito con inventarios en tiempo real, punto de venta POS, CRM, contabilidad y ventas en el Marketplace Kalarti.',
};

export default function ComercioPage() {
  const beneficios = [
    {
      icon: '🏪',
      title: 'Punto de Venta (POS) e Inventario Multi-Sede',
      desc: 'Controla existencias en bodega y mostrador, registra ventas rápidas, traslados entre puntos de venta y alertas de stock mínimo.',
    },
    {
      icon: '🌐',
      title: 'Tienda Online en el Marketplace Kalarti',
      desc: 'Publica tus productos y liquidaciones de sobrantes con cobro integrado mediante Mercado Pago Checkout Pro.',
    },
    {
      icon: '📍',
      title: 'Precios Articulados a APUs de tu Municipio',
      desc: 'Tus ofertas alimentan los costos regionales del Cotizador Kalarti en tu municipio, atrayendo automáticamente a quienes presupuestan en tu zona.',
    },
    {
      icon: '🤝',
      title: 'CRM, Agenda Comercial y Despachos',
      desc: 'Gestiona clientes, cotizaciones por WhatsApp/Telegram y programación de entregas a obra desde un solo panel.',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#050b16', color: '#f8fafc', fontFamily: 'var(--font-inter), sans-serif' }}>
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1200, margin: '0 auto' }}>
        <Link href="/" style={{ color: '#f8fafc', textDecoration: 'none', fontWeight: 900, fontSize: 20 }}>
          KALARTI <span style={{ color: '#10b981', fontSize: 12, fontWeight: 700 }}>COMERCIO & POS</span>
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/erp" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: 13, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)' }}>
            Ingresar a mi POS
          </Link>
          <Link href="/registro?tipo=comercio" style={{ background: '#10b981', color: '#0f172a', textDecoration: 'none', fontWeight: 800, fontSize: 13, padding: '8px 16px', borderRadius: 8 }}>
            Crear Cuenta Comercio ➔
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 1140, margin: '0 auto', padding: '56px 24px 80px' }}>
        <section style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '6px 14px', borderRadius: 999, marginBottom: 14 }}>
            🏪 Ferreterías · Depósitos de Materiales · Centros de Acabados
          </span>
          <h1 style={{ fontSize: 'clamp(28px, 4.5vw, 48px)', fontWeight: 900, lineHeight: 1.15, margin: '0 auto 16px', maxWidth: 820 }}>
            Digitaliza tu ferretería con POS, Inventario y Marketplace B2B
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 16, maxWidth: 680, margin: '0 auto 28px', lineHeight: 1.6 }}>
            Convierte tu ferretería en el centro logístico de las obras de tu municipio. Administra tus ventas de mostrador y recibe pedidos electrónicos directamente desde los presupuestos de construcción.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/registro?tipo=comercio" style={{ background: '#10b981', color: '#0f172a', fontWeight: 800, fontSize: 15, padding: '14px 26px', borderRadius: 10, textDecoration: 'none' }}>
              Activar mi Ferretería / POS ➔
            </Link>
            <Link href="/marketplace" style={{ background: 'rgba(255,255,255,0.06)', color: '#f8fafc', fontWeight: 700, fontSize: 15, padding: '14px 24px', borderRadius: 10, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}>
              Explorar Marketplace ➔
            </Link>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 18 }}>
          {beneficios.map((b, i) => (
            <div key={i} style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(16, 185, 129, 0.22)', borderRadius: 14, padding: 24 }}>
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
