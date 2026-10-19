import Link from 'next/link';
import CookieSettingsButton from './CookieSettingsButton';

export const metadata = {
  title: 'Política de Privacidad, Habeas Data y Cookies | KALARTI S.A.S.',
  description:
    'Política de Tratamiento de Datos Personales conforme a la Ley 1581 de 2012 (Habeas Data en Colombia) y Política de Cookies de KALARTI Constructores y Consultores S.A.S.',
  alternates: {
    canonical: 'https://www.kalarti.com/privacidad',
  },
};

export default function PrivacidadPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: '#0f172a',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '18px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '19px',
            }}
          >
            <img
              src="/icon.png"
              alt="KALARTI Logo"
              style={{ width: '34px', height: '34px', borderRadius: '8px' }}
            />
            <span>KALARTI S.A.S.</span>
          </Link>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <Link
              href="/blog"
              style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}
            >
              Blog Técnico
            </Link>
            <Link
              href="/"
              style={{
                background: '#f59e0b',
                color: '#0f172a',
                padding: '8px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              ← Volver al Inicio
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '920px', margin: '0 auto', padding: '48px 24px 80px 24px' }}>
        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            padding: '40px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              background: '#fef3c7',
              color: '#b45309',
              fontWeight: 700,
              fontSize: '12px',
              padding: '5px 12px',
              borderRadius: '999px',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
            }}
          >
            Marco Legal Colombia • Ley 1581 de 2012 & Decreto 1377 de 2013
          </span>

          <h1
            style={{
              fontSize: '32px',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.25,
              marginBottom: '12px',
            }}
          >
            Política de Tratamiento de Datos Personales (Habeas Data) y Gestión de Cookies
          </h1>

          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '32px' }}>
            Última actualización: Octubre de 2026 | Responsable: <strong>KALARTI Constructores y Consultores S.A.S.</strong>
          </p>

          {/* Interactive Cookie Preferences Box */}
          <div
            style={{
              background: '#0f172a',
              color: '#f8fafc',
              padding: '24px',
              borderRadius: '14px',
              marginBottom: '36px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ maxWidth: '520px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px', color: '#ffffff' }}>
                Panel de Control de Cookies del Usuario
              </h2>
              <p style={{ fontSize: '13.5px', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                Usted puede modificar o revocar en cualquier momento su consentimiento sobre las cookies analíticas y de personalización en <strong>kalarti.com</strong>.
              </p>
            </div>
            <CookieSettingsButton />
          </div>

          {/* Section 1 */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px', color: '#0f172a' }}>
              1. Identificación del Responsable del Tratamiento
            </h2>
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#334155', marginBottom: '12px' }}>
              En cumplimiento de lo dispuesto en el artículo 15 de la Constitución Política de Colombia, la <strong>Ley Estatutaria 1581 de 2012</strong>, el <strong>Decreto Reglamentario 1377 de 2013</strong> (compilado en el Decreto 1074 de 2015) y las directrices de la Superintendencia de Industria y Comercio (SIC), se informa a los usuarios, clientes y visitantes del portal web <strong>www.kalarti.com</strong> que el responsable del tratamiento de los datos es:
            </p>
            <ul
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '18px 24px 18px 38px',
                fontSize: '14.5px',
                lineHeight: 1.8,
                color: '#1e293b',
              }}
            >
              <li><strong>Razón Social:</strong> KALARTI Constructores y Consultores S.A.S.</li>
              <li><strong>Domicilio y Dirección:</strong> Cra 28a No 17 15 Edificio Antonella Of. 401, Pasto — Nariño, Colombia.</li>
              <li><strong>Canal de Atención y WhatsApp Corporativo:</strong> +57 315 271 7932</li>
              <li><strong>Sitio Web Oficial:</strong> https://www.kalarti.com</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px', color: '#0f172a' }}>
              2. ¿Qué son las Cookies y para qué las utilizamos en KALARTI?
            </h2>
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#334155', marginBottom: '16px' }}>
              Una cookie es un pequeño archivo de texto o registro de almacenamiento local que se descarga en el navegador del usuario al acceder a determinadas páginas web. En <strong>KALARTI S.A.S.</strong> utilizamos cookies propias y de terceros con tres propósitos técnicos, estadísticos y comerciales claramente delimitados:
            </p>

            <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <thead>
                  <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0' }}>Categoría</th>
                    <th style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0' }}>Cookies / Identificadores</th>
                    <th style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0' }}>Finalidad Técnica y Estratégica</th>
                    <th style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0' }}>Duración</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>
                      Técnicas / Esenciales
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: '12.5px' }}>
                      kalarti_cookie_consent, sesión de usuario
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      Garantizar el funcionamiento seguro del sitio, almacenar la decisión de consentimiento de privacidad y mantener la sesión en el portal corporativo.
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0' }}>12 meses / Sesión</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>
                      Analíticas (Google Analytics 4)
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: '12.5px' }}>
                      _ga, _ga_V4M6ZBVX0S
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      Medir de forma agregada y anónima el tráfico en artículos técnicos (modelación hidráulica, BIM, bio-construcción), tiempo de lectura, origen geográfico y clics hacia contacto por WhatsApp.
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0' }}>Hasta 24 meses</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>
                      Personalización y Conversión
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: '12.5px' }}>
                      Preferencias de categoría, atribuciones UTM
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      Recordar las áreas de interés técnico del visitante y optimizar futuras campañas informativas en LinkedIn, Google o redes profesionales.
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0' }}>6 a 12 meses</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3 */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px', color: '#0f172a' }}>
              3. Finalidad del Tratamiento de Datos Personales
            </h2>
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#334155', marginBottom: '12px' }}>
              Los datos personales que el titular suministre voluntariamente a través de nuestros formularios de contacto, cotizaciones técnicas, enlaces de WhatsApp o canales electrónicos serán tratados exclusivamente para:
            </p>
            <ul style={{ paddingLeft: '22px', fontSize: '15px', lineHeight: 1.75, color: '#334155' }}>
              <li>Atender solicitudes de consultoría en diseño arquitectónico, coordinación BIM (Arquitectura, Estructuras, MEP), bio-construcción, cálculo estructural y modelación hidrológica/hidráulica de cuencas.</li>
              <li>Elaborar propuestas técnico-económicas, contratos de obra o consultoría y gestionar la relación precontractual, contractual y poscontractual.</li>
              <li>Mejorar continuamente el contenido investigativo y técnico publicado en el Blog de KALARTI mediante métricas estadísticas desidentificadas.</li>
              <li>Dar cumplimiento a obligaciones legales, contables, tributarias y regulatorias en la República de Colombia.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px', color: '#0f172a' }}>
              4. Derechos de los Titulares de los Datos (Habeas Data)
            </h2>
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#334155', marginBottom: '12px' }}>
              De conformidad con el artículo 8 de la Ley 1581 de 2012, el titular de los datos personales tiene los siguientes derechos:
            </p>
            <ul style={{ paddingLeft: '22px', fontSize: '15px', lineHeight: 1.75, color: '#334155' }}>
              <li><strong>Conocer, actualizar y rectificar</strong> sus datos personales frente a KALARTI S.A.S.</li>
              <li><strong>Solicitar prueba de la autorización</strong> otorgada para el tratamiento de sus datos.</li>
              <li><strong>Ser informado</strong> respecto del uso que se le ha dado a sus datos personales.</li>
              <li><strong>Revocar la autorización y/o solicitar la supresión</strong> del dato cuando en el tratamiento no se respeten los principios, derechos y garantías constitucionales y legales.</li>
              <li><strong>Presentar quejas</strong> ante la Superintendencia de Industria y Comercio (SIC) por infracciones a lo dispuesto en la normatividad vigente.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px', color: '#0f172a' }}>
              5. Cómo Desactivar Cookies desde su Navegador o Ejercer sus Derechos
            </h2>
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#334155', marginBottom: '16px' }}>
              Además del botón interactivo incluido al inicio de esta página, usted puede bloquear o eliminar las cookies directamente desde la configuración de su navegador (Google Chrome, Mozilla Firefox, Safari o Microsoft Edge). Para cualquier consulta, petición o reclamo relacionado con Habeas Data, puede comunicarse directamente con nuestra dirección administrativa en Pasto (Cra 28a No 17 15 Ed. Antonella Of. 401) o a través de nuestra línea oficial de atención <a href="https://wa.me/573152717932" target="_blank" rel="noopener noreferrer" style={{ color: '#d97706', fontWeight: 700 }}>+57 315 271 7932</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
