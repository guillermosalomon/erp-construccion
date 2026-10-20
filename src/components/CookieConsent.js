'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const STORAGE_KEY = 'kalarti_cookie_consent';
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-V4M6ZBVX0S';

const FALLBACK_TITLES = {
  '/': 'KALARTI — Constructores y Consultores | Diseño, BIM & Construcción',
  '/blog': 'Territorio, Ingeniería Digital & Bio-Arquitectura | Blog KALARTI',
  '/propiedades': 'Inmuebles y Proyectos en Venta en Pasto, Chachagüí y Santa Marta | KALARTI Inmobiliaria',
  '/privacidad': 'Política de Privacidad, Habeas Data y Cookies | KALARTI S.A.S.',
  '/landing/construccion': 'Construcción de Viviendas en Pasto y Nariño | KALARTI Constructores',
};

export default function CookieConsent() {
  const pathname = usePathname();
  const isInitialMount = useRef(true);
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: true,
    marketing: true,
  });

  const applyGtagConsent = (prefs) => {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: prefs.analytics ? 'granted' : 'denied',
        ad_storage: prefs.marketing ? 'granted' : 'denied',
        ad_user_data: prefs.marketing ? 'granted' : 'denied',
        ad_personalization: prefs.marketing ? 'granted' : 'denied',
      });
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        const timer = setTimeout(() => setVisible(true), 600);
        return () => clearTimeout(timer);
      } else {
        const parsed = JSON.parse(saved);
        setPreferences({
          essential: true,
          analytics: Boolean(parsed.analytics),
          marketing: Boolean(parsed.marketing),
        });
        applyGtagConsent(parsed);
      }
    } catch (e) {
      setVisible(true);
    }
  }, []);

  // Allow opening settings from anywhere (e.g., /privacidad page)
  useEffect(() => {
    const handleOpenSettings = () => {
      setVisible(true);
      setShowDetails(true);
    };
    window.addEventListener('kalarti:open-cookie-settings', handleOpenSettings);
    return () => window.removeEventListener('kalarti:open-cookie-settings', handleOpenSettings);
  }, []);

  // Synchronize SPA route changes with GA4 after Next.js updates <title> to prevent (not set)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        const cleanTitle =
          (document.title && document.title.trim()) ||
          FALLBACK_TITLES[pathname] ||
          'KALARTI — Constructores y Consultores';
        window.gtag('config', GA_ID, {
          page_path: pathname,
          page_title: cleanTitle,
        });
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [pathname]);

  // Global conversion tracking for WhatsApp clicks and media interactions in GA4
  useEffect(() => {
    const handleGlobalClick = (e) => {
      const anchor = e.target.closest('a');
      if (!anchor || !anchor.href) return;

      if (anchor.href.includes('wa.me') || anchor.href.includes('whatsapp.com')) {
        if (typeof window.gtag === 'function') {
          const cleanTitle =
            (document.title && document.title.trim()) ||
            FALLBACK_TITLES[window.location.pathname] ||
            'KALARTI — Constructores y Consultores';
          window.gtag('event', 'contact_whatsapp', {
            event_category: 'conversion',
            page_path: window.location.pathname,
            page_title: cleanTitle,
            button_text: (anchor.innerText || 'WhatsApp CTA').trim().slice(0, 80),
          });
        }
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  const saveConsent = (newPrefs) => {
    const payload = {
      ...newPrefs,
      essential: true,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.error('Could not save cookie consent:', err);
    }
    setPreferences(newPrefs);
    applyGtagConsent(newPrefs);
    setVisible(false);
    setShowDetails(false);
  };

  const handleAcceptAll = () => {
    saveConsent({ essential: true, analytics: true, marketing: true });
  };

  const handleEssentialOnly = () => {
    saveConsent({ essential: true, analytics: false, marketing: false });
  };

  const handleSaveCustom = () => {
    saveConsent(preferences);
  };

  if (!visible) return null;

  return (
    <div className="kalarti-cookie-wrapper" role="dialog" aria-live="polite" aria-label="Aviso de privacidad y cookies">
      <style dangerouslySetInnerHTML={{ __html: `
        .kalarti-cookie-wrapper {
          position: fixed;
          bottom: 20px;
          left: 20px;
          right: 20px;
          max-width: 980px;
          margin: 0 auto;
          z-index: 9999;
          background: rgba(15, 23, 42, 0.97);
          backdrop-filter: blur(16px);
          color: #f8fafc;
          border: 1px solid rgba(212, 168, 67, 0.35);
          border-radius: 16px;
          padding: 20px 24px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
          font-family: var(--font-inter), 'Inter', -apple-system, sans-serif;
          animation: kalartiSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes kalartiSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .kalarti-cookie-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .kalarti-cookie-text-col {
          flex: 1;
        }

        .kalarti-cookie-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #d4a843;
          font-size: 11.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 6px;
        }

        .kalarti-cookie-title {
          font-size: 16px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 6px 0;
        }

        .kalarti-cookie-desc {
          font-size: 13.5px;
          color: #cbd5e1;
          line-height: 1.55;
          margin: 0;
        }

        .kalarti-cookie-desc a {
          color: #d4a843;
          text-decoration: underline;
          font-weight: 600;
        }

        .kalarti-cookie-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          flex-wrap: wrap;
        }

        .kalarti-btn-accept {
          background: #d4a843;
          color: #0f172a;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13.5px;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }

        .kalarti-btn-accept:hover {
          background: #e5b952;
          transform: translateY(-1px);
        }

        .kalarti-btn-essential {
          background: rgba(255, 255, 255, 0.08);
          color: #e2e8f0;
          border: 1px solid rgba(255, 255, 255, 0.18);
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .kalarti-btn-essential:hover {
          background: rgba(255, 255, 255, 0.14);
          color: #ffffff;
        }

        .kalarti-btn-config {
          background: transparent;
          color: #94a3b8;
          border: none;
          padding: 8px 10px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
        }

        .kalarti-btn-config:hover {
          color: #ffffff;
        }

        .kalarti-cookie-details {
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .kalarti-cookie-opt {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 12px 14px;
        }

        .kalarti-cookie-opt-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
          font-size: 13.5px;
          font-weight: 700;
          color: #ffffff;
        }

        .kalarti-cookie-opt-p {
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.45;
          margin: 0;
        }

        @media (max-width: 820px) {
          .kalarti-cookie-wrapper {
            bottom: 12px;
            left: 12px;
            right: 12px;
            padding: 18px;
          }
          .kalarti-cookie-main {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .kalarti-cookie-actions {
            width: 100%;
          }
          .kalarti-btn-accept, .kalarti-btn-essential {
            flex: 1;
            text-align: center;
          }
          .kalarti-cookie-details {
            grid-template-columns: 1fr;
          }
        }
      `}} />

      <div className="kalarti-cookie-main">
        <div className="kalarti-cookie-text-col">
          <div className="kalarti-cookie-badge">🛡️ Privacidad &amp; Transparencia de Datos</div>
          <h4 className="kalarti-cookie-title">Valoramos su privacidad en KALARTI S.A.S.</h4>
          <p className="kalarti-cookie-desc">
            Utilizamos cookies propias y de terceros (Google Analytics 4) para optimizar la experiencia de navegación, analizar la lectura de nuestros artículos técnicos y mejorar nuestros servicios de arquitectura e ingeniería conforme a la <strong>Ley 1581 de 2012 (Habeas Data)</strong>. Consulte nuestra{' '}
            <Link href="/privacidad">Política de Privacidad y Cookies</Link>.
          </p>
        </div>

        <div className="kalarti-cookie-actions">
          <button type="button" onClick={handleAcceptAll} className="kalarti-btn-accept">
            Aceptar todas
          </button>
          <button type="button" onClick={handleEssentialOnly} className="kalarti-btn-essential">
            Solo esenciales
          </button>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="kalarti-btn-config"
          >
            {showDetails ? 'Ocultar opciones' : 'Configurar'}
          </button>
        </div>
      </div>

      {showDetails && (
        <div>
          <div className="kalarti-cookie-details">
            <div className="kalarti-cookie-opt">
              <div className="kalarti-cookie-opt-head">
                <span>1. Técnicas / Esenciales</span>
                <span style={{ fontSize: '11px', color: '#d4a843', fontWeight: 700 }}>Siempre activas</span>
              </div>
              <p className="kalarti-cookie-opt-p">
                Necesarias para la navegación segura, reproducción de audio/video en el blog y almacenamiento de su preferencia de privacidad.
              </p>
            </div>

            <div className="kalarti-cookie-opt">
              <div className="kalarti-cookie-opt-head">
                <label htmlFor="chk-analytics" style={{ cursor: 'pointer' }}>2. Analíticas (GA4)</label>
                <input
                  id="chk-analytics"
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                  style={{ accentColor: '#d4a843', width: '16px', height: '16px', cursor: 'pointer' }}
                />
              </div>
              <p className="kalarti-cookie-opt-p">
                Nos permiten medir de forma estadística qué artículos y proyectos generan mayor interés para seguir creando contenido técnico de valor.
              </p>
            </div>

            <div className="kalarti-cookie-opt">
              <div className="kalarti-cookie-opt-head">
                <label htmlFor="chk-marketing" style={{ cursor: 'pointer' }}>3. Personalización</label>
                <input
                  id="chk-marketing"
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                  style={{ accentColor: '#d4a843', width: '16px', height: '16px', cursor: 'pointer' }}
                />
              </div>
              <p className="kalarti-cookie-opt-p">
                Permiten recordar sus áreas de interés (BIM, Hidrología, Bio-Construcción o Inmobiliaria) para ofrecerle atención relevante.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
            <button type="button" onClick={handleSaveCustom} className="kalarti-btn-accept" style={{ padding: '8px 18px', fontSize: '13px' }}>
              Guardar mis preferencias
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
