/**
 * Landing Page Layout — /landing/*
 * Standalone layout without ERP navigation/providers
 * Optimized for marketing conversion
 */

export const metadata = {
    title: 'Construcción de Viviendas en Pasto y Nariño | KALARTI Constructores',
    description: 'Constructora profesional en Pasto, Nariño. Diseño BIM, construcción de viviendas, apartamentos y obras civiles. Cotización gratuita. +10 años de experiencia.',
    keywords: 'constructora Pasto, construcción vivienda Nariño, diseño arquitectónico, obras civiles, BIM, presupuesto construcción',
    openGraph: {
        title: 'KALARTI Constructores — Construcción Profesional en Nariño',
        description: 'Ingenieros certificados con metodología BIM. Cotización gratuita para tu proyecto de construcción.',
        type: 'website',
    },
};

export default function LandingLayout({ children }) {
    return children;
}
