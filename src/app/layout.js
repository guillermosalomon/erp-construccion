import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
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
        url: "/blog/images/og/blog-og.jpg",
        secureUrl: "https://www.kalarti.com/blog/images/og/blog-og.jpg",
        width: 1200,
        height: 630,
        alt: "KALARTI — Consultoría Técnica, Modelación de Cuencas, BIM & Bio-Construcción",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KALARTI — Constructores y Consultores | Diseño, BIM & Construcción",
    description: "Firma de ingeniería y arquitectura especializada en modelación de cuencas, coordinación BIM y bio-construcción.",
    images: ["https://www.kalarti.com/blog/images/og/blog-og.jpg"],
  },
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={inter.variable}>
      <head>
        {/* Google tag (gtag.js) */}
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
              gtag('js', new Date());
              gtag('config', '${GA_ID}', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
