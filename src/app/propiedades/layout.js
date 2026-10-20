export const metadata = {
  metadataBase: new URL('https://www.kalarti.com'),
  title: 'Inmuebles y Proyectos en Venta en Pasto, Chachagüí y Santa Marta | KALARTI Inmobiliaria',
  description:
    'Portafolio oficial de inmuebles y proyectos en venta de KALARTI: lotes comerciales con proyecto en Pasto, cabañas y apartamentos campestres en Chachagüí, apartamentos turísticos en Santa Marta y lotes urbanizados en El Bordo.',
  alternates: {
    canonical: 'https://www.kalarti.com/propiedades',
  },
  openGraph: {
    title: 'Inmuebles y Proyectos en Venta | KALARTI Inmobiliaria',
    description:
      'Explora lotes comerciales esquineros en Pasto, apartamentos turísticos frente al mar en Santa Marta y propiedades campestres en Chachagüí.',
    url: 'https://www.kalarti.com/propiedades',
    siteName: 'KALARTI Inmobiliaria',
    locale: 'es_CO',
    type: 'website',
    images: [
      {
        url: 'https://www.kalarti.com/inmuebles-web/lote-esquinero-proyecto-mixto-potrerillo-pasto/og-card.jpg',
        secureUrl: 'https://www.kalarti.com/inmuebles-web/lote-esquinero-proyecto-mixto-potrerillo-pasto/og-card.jpg',
        width: 1200,
        height: 630,
        alt: 'Catálogo de Inmuebles y Proyectos en Venta — KALARTI Inmobiliaria',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Inmuebles y Proyectos en Venta | KALARTI Inmobiliaria',
    description:
      'Lotes comerciales en Pasto, propiedades campestres en Chachagüí y apartamentos turísticos en Santa Marta.',
    images: ['https://www.kalarti.com/inmuebles-web/lote-esquinero-proyecto-mixto-potrerillo-pasto/og-card.jpg'],
  },
};

export default function PropiedadesLayout({ children }) {
  return children;
}
