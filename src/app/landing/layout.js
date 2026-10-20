/**
 * Landing Page Layout — /landing/*
 * Standalone layout without ERP navigation/providers
 * Optimized for marketing conversion
 */

export const metadata = {
    metadataBase: new URL('https://www.kalarti.com'),
    title: 'Construcción de Viviendas en Pasto y Nariño | KALARTI Constructores',
    description: 'Constructora profesional en Pasto, Nariño. Diseño BIM, construcción de viviendas, apartamentos y obras civiles. Cotización gratuita. +10 años de experiencia.',
    keywords: 'constructora Pasto, construcción vivienda Nariño, diseño arquitectónico, obras civiles, BIM, presupuesto construcción',
    openGraph: {
        title: 'KALARTI Constructores — Construcción Profesional en Nariño',
        description: 'Ingenieros certificados con metodología BIM. Cotización gratuita para tu proyecto de construcción.',
        type: 'website',
        siteName: 'KALARTI Constructores y Consultores',
        locale: 'es_CO',
        images: [
            {
                url: 'https://www.kalarti.com/kalarti-og-logo.jpg',
                secureUrl: 'https://www.kalarti.com/kalarti-og-logo.jpg',
                width: 1200,
                height: 630,
                alt: 'KALARTI — Constructores y Consultores S.A.S.',
                type: 'image/jpeg',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'KALARTI Constructores — Construcción Profesional en Nariño',
        description: 'Ingenieros certificados con metodología BIM. Cotización gratuita para tu proyecto de construcción.',
        images: ['https://www.kalarti.com/kalarti-og-logo.jpg'],
    },
};

export default function LandingLayout({ children }) {
    return children;
}
