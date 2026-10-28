import Link from 'next/link';
import { PLANES_CONSTRUCTORAS, PRODUCTOS, formatMoney } from '@/lib/planes';

export const metadata = {
  title: 'Planes para Constructoras y Contratistas — ERP 5D & Cotizador NSR-10 | KALARTI',
  description:
    'Suscripciones y planes Kalarti para constructoras, ingenieros y contratistas: presupuestos NSR-10, control de obra BIM 5D, logística y Red de Talento.',
};

export default function PlanesPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#050b16', color: '#f8fafc', fontFamily: 'var(--font-inter), sans-serif' }}>
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1200, margin: '0 auto' }}>
        <Link href="/" style={{ color: '#f8fafc', textDecoration: 'none', fontWeight: 900, fontSize: 20 }}>
          KALARTI <span style={{ color: '#d4af37', fontSize: 12, fontWeight: 700 }}>CONSTRUCTORAS & ERP 5D</span>
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/cotizador" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: 13, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)' }}>
            Ir al Cotizador
          </Link>
          <Link href="/registro?tipo=constructor" style={{ background: '#d4af37', color: '#0f172a', textDecoration: 'none', fontWeight: 800, fontSize: 13, padding: '8px 16px', borderRadius: 8 }}>
            Crear Cuenta Constructora ➔
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '56px 24px 80px' }}>
        <section style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#d4af37', background: 'rgba(212,175,55,0.12)', padding: '6px 14px', borderRadius: 999, marginBottom: 14 }}>
            🏗️ Presupuestos NSR-10 · Seguimiento 4D/5D · Bodega de Obra · Red Bidireccional de Talento
          </span>
          <h1 style={{ fontSize: 'clamp(28px, 4.5vw, 46px)', fontWeight: 900, lineHeight: 1.15, margin: '0 auto 14px', maxWidth: 860 }}>
            Planes diseñados para Constructoras, Contratistas y Firmas de Ingeniería
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 16, maxWidth: 700, margin: '0 auto', lineHeight: 1.6 }}>
            Administra tus obras en un entorno aislado para tu empresa, contrata personal verificado en 1 clic y subcontrata cuadrillas con capacidad ociosa en tu región. Pagos 100% seguros con Mercado Pago.
          </p>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 22, marginBottom: 48 }}>
          {PLANES_CONSTRUCTORAS.map((plan) => (
            <div
              key={plan.key}
              style={{
                background: plan.destacado ? 'linear-gradient(180deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.95) 100%)' : 'rgba(15, 23, 42, 0.85)',
                border: plan.destacado ? '2px solid #d4af37' : '1px solid rgba(255,255,255,0.12)',
                borderRadius: 16,
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 20,
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc' }}>{plan.nombre}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: plan.destacado ? '#d4af37' : 'rgba(255,255,255,0.08)', color: plan.destacado ? '#0f172a' : '#cbd5e1' }}>
                    {plan.badge}
                  </span>
                </div>
                <div style={{ marginBottom: 18 }}>
                  <span style={{ fontSize: 34, fontWeight: 900, color: '#d4af37' }}>
                    {formatMoney(plan.precio.COP, 'COP')}
                  </span>
                  <span style={{ fontSize: 13, color: '#94a3b8', marginLeft: 6 }}>COP {plan.periodo}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.beneficios.map((f, idx) => (
                    <li key={idx} style={{ fontSize: 13, color: '#cbd5e1', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.45 }}>
                      <span style={{ color: '#10b981', fontWeight: 900 }}>✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={`/registro?tipo=constructor&plan=${plan.key}`}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: plan.destacado ? '#d4af37' : '#38bdf8',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: 14,
                  padding: '13px 18px',
                  borderRadius: 10,
                  textDecoration: 'none',
                }}
              >
                Elegir {plan.nombre} y Crear Cuenta ➔
              </Link>
            </div>
          ))}
        </section>

        <section style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 16, padding: 28, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc', marginBottom: 6 }}>
              📊 ¿Solo necesitas exportar un presupuesto puntual a Excel?
            </div>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
              Usa gratis el Cotizador Kalarti y descarga el libro Excel profesional con APUs desglosados por {formatMoney(PRODUCTOS.export.precio.COP, 'COP')} COP por proyecto.
            </p>
          </div>
          <Link
            href="/cotizador"
            style={{
              background: 'transparent',
              border: '1px solid #38bdf8',
              color: '#38bdf8',
              fontWeight: 800,
              fontSize: 13,
              padding: '12px 20px',
              borderRadius: 10,
              textDecoration: 'none',
            }}
          >
            Abrir Cotizador Gratis ➔
          </Link>
        </section>
      </main>
    </div>
  );
}
