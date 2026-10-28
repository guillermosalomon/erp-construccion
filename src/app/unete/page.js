import Link from 'next/link';
import ConvocatoriasPublicasList from '@/components/ecosistema/ConvocatoriasPublicasList';

export const metadata = {
  title: 'Trabaja con Nosotros — Red de Profesionales y Cuadrillas | KALARTI',
  description:
    'Únete gratis a la Red de Talento Kalarti. Postúlate a obras y licitaciones, obtén el sello Verificado y conecta con constructoras en toda Colombia.',
};

export default function UnetePage() {
  const beneficios = [
    {
      icon: '✔',
      title: 'Sello Profesional Verificado',
      desc: 'Carga tu cédula, hoja de vida, tarjeta profesional (COPNIA/CONTE) y certificados SST/Alturas. Nuestro equipo valida tu perfil para destacarte ante las constructoras.',
    },
    {
      icon: '🏗️',
      title: 'Contratación Directa en Obras',
      desc: 'Las constructoras que presupuestan en el ERP Kalarti ven directamente a los profesionales y cuadrillas disponibles en el municipio de la obra y los vinculan en 1 clic.',
    },
    {
      icon: '📋',
      title: 'Convocatorias y Licitaciones Abiertas',
      desc: 'Aplica a vacantes reales de obra civil, estructura, instalaciones hidrosanitarias, eléctricas, bioconstrucción en guadua y dirección técnica.',
    },
    {
      icon: '🔒',
      title: 'Privacidad Protegida (Ley 1581)',
      desc: '100% gratuito para trabajadores y profesionales. Tus datos de contacto y documentos sensibles solo se comparten cuando te postulas o aceptas una vinculación.',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#050b16', color: '#f8fafc', fontFamily: 'var(--font-inter), sans-serif' }}>
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1200, margin: '0 auto' }}>
        <Link href="/" style={{ color: '#f8fafc', textDecoration: 'none', fontWeight: 900, fontSize: 20, letterSpacing: '0.06em' }}>
          KALARTI <span style={{ color: '#38bdf8', fontSize: 12, fontWeight: 700 }}>RED DE TALENTO</span>
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/mi-portal" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: 13, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)' }}>
            Mi Portal Profesional
          </Link>
          <Link href="/registro?tipo=profesional" style={{ background: '#38bdf8', color: '#0f172a', textDecoration: 'none', fontWeight: 800, fontSize: 13, padding: '8px 16px', borderRadius: 8 }}>
            Registrarme Gratis ➔
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 1140, margin: '0 auto', padding: '56px 24px 80px' }}>
        <section style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#38bdf8', background: 'rgba(56,189,248,0.12)', padding: '6px 14px', borderRadius: 999, marginBottom: 14 }}>
            👷 Ingenieros · Arquitectos · Maestros · Oficiales · Cuadrillas
          </span>
          <h1 style={{ fontSize: 'clamp(28px, 4.5vw, 48px)', fontWeight: 900, lineHeight: 1.15, margin: '0 auto 16px', maxWidth: 820 }}>
            Conecta tu talento con las obras y constructoras de tu región
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 16, maxWidth: 680, margin: '0 auto 28px', lineHeight: 1.6 }}>
            Haz parte del directorio técnico de Kalarti. Define tus oficios, tarifas de referencia y municipios de cobertura para recibir contrataciones directas desde los presupuestos de obra.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/registro?tipo=profesional" style={{ background: '#38bdf8', color: '#0f172a', fontWeight: 800, fontSize: 15, padding: '14px 26px', borderRadius: 10, textDecoration: 'none' }}>
              Crear mi Perfil en 2 Minutos ➔
            </Link>
            <Link href="/mi-portal" style={{ background: 'rgba(255,255,255,0.06)', color: '#f8fafc', fontWeight: 700, fontSize: 15, padding: '14px 24px', borderRadius: 10, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}>
              Ya tengo cuenta · Ir a Mi Portal
            </Link>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 18, marginBottom: 56 }}>
          {beneficios.map((b, i) => (
            <div key={i} style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{b.icon}</div>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 8, color: '#f8fafc' }}>{b.title}</h2>
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.55, margin: 0 }}>{b.desc}</p>
            </div>
          ))}
        </section>

        <ConvocatoriasPublicasList />
      </main>
    </div>
  );
}
