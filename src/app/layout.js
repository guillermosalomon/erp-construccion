import { Inter, Oswald } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import CookieConsent from "@/components/CookieConsent";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  display: "swap",
});

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-V4M6ZBVX0S";

export const metadata = {
  metadataBase: new URL("https://www.kalarti.com"),
  title: {
    default: "KALARTI — Constructores y Consultores | Diseño, BIM & Construcción",
    template: "%s | KALARTI",
  },
  description: "Firma de ingeniería y arquitectura especializada en diseño de viviendas campestres de lujo, cálculo estructural NSR-10, bio-construcción en guadua, modelación hidrológica de cuencas y coordinación BIM 5D.",
  openGraph: {
    title: "KALARTI — Constructores y Consultores | Diseño, BIM & Construcción",
    description: "Firma de ingeniería y arquitectura especializada en diseño de viviendas campestres de lujo, cálculo estructural NSR-10, bio-construcción en guadua, modelación hidrológica de cuencas y coordinación BIM 5D.",
    url: "https://www.kalarti.com",
    siteName: "KALARTI Constructores y Consultores",
    locale: "es_CO",
    type: "website",
    images: [
      {
        url: "https://www.kalarti.com/kalarti-og-logo.png?v=3",
        secureUrl: "https://www.kalarti.com/kalarti-og-logo.png?v=3",
        width: 1200,
        height: 630,
        alt: "KALARTI — Constructores y Consultores S.A.S.",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KALARTI — Constructores y Consultores | Diseño, BIM & Construcción",
    description: "Firma de ingeniería y arquitectura especializada en modelación de cuencas, coordinación BIM y bio-construcción.",
    images: ["https://www.kalarti.com/kalarti-og-logo.png?v=3"],
  },
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${inter.variable} ${oswald.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {/* Google tag (gtag.js) with Consent Mode v2 */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {
                'analytics_storage': 'granted',
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
                'wait_for_update': 500
              });
              try {
                var savedConsent = localStorage.getItem('kalarti_cookie_consent');
                if (savedConsent) {
                  var parsed = JSON.parse(savedConsent);
                  gtag('consent', 'update', {
                    'analytics_storage': parsed.analytics ? 'granted' : 'denied',
                    'ad_storage': parsed.marketing ? 'granted' : 'denied',
                    'ad_user_data': parsed.marketing ? 'granted' : 'denied',
                    'ad_personalization': parsed.marketing ? 'granted' : 'denied'
                  });
                }
              } catch (e) {}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', {
                page_path: window.location.pathname,
                page_title: document.title || 'KALARTI — Constructores y Consultores',
                anonymize_ip: true
              });
            `,
          }}
        />
      </head>
      <body>
        <Providers>
          {children}
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}
