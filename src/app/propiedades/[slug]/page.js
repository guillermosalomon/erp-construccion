import { notFound } from 'next/navigation';
import { inmuebles, getInmuebleBySlug } from '@/data/inmuebles';
import PropertyDetailClient from './PropertyDetailClient';

export async function generateStaticParams() {
  return inmuebles.map((i) => ({
    slug: i.slug,
  }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const inmueble = getInmuebleBySlug(slug);

  if (!inmueble) {
    return {
      title: 'Propiedad no encontrada | Kalarti',
      description: 'La propiedad solicitada no se encuentra disponible.',
    };
  }

  const siteUrl = 'https://kalarti.com';
  const canonicalUrl = `${siteUrl}/propiedades/${slug}`;
  const imageUrl = `${siteUrl}${inmueble.portada_url}`;

  return {
    title: inmueble.seo?.title || `${inmueble.titulo} | Kalarti`,
    description: inmueble.seo?.description || inmueble.descripcion_corta,
    keywords: inmueble.seo?.keywords?.join(', ') || 'inmobiliaria, bienes raices, pasto, venta inmuebles',
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: inmueble.seo?.title || inmueble.titulo,
      description: inmueble.seo?.description || inmueble.descripcion_corta,
      url: canonicalUrl,
      siteName: 'Kalarti Inmobiliaria',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: inmueble.titulo,
        },
      ],
      locale: 'es_CO',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: inmueble.seo?.title || inmueble.titulo,
      description: inmueble.seo?.description || inmueble.descripcion_corta,
      images: [imageUrl],
    },
  };
}

export default async function PropertyDetailPage({ params }) {
  const { slug } = await params;
  const inmueble = getInmuebleBySlug(slug);

  if (!inmueble) {
    notFound();
  }

  const relatedInmuebles = inmuebles.filter((i) => i.slug !== slug);

  // Schema.org Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'Inicio',
            'item': 'https://kalarti.com',
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': 'Propiedades',
            'item': 'https://kalarti.com/propiedades',
          },
          {
            '@type': 'ListItem',
            'position': 3,
            'name': inmueble.titulo,
            'item': `https://kalarti.com/propiedades/${inmueble.slug}`,
          },
        ],
      },
      {
        '@type': ['RealEstateListing', inmueble.seo?.schema_type || 'Product'],
        'name': inmueble.titulo,
        'description': inmueble.seo?.description || inmueble.descripcion_corta,
        'url': `https://kalarti.com/propiedades/${inmueble.slug}`,
        'image': `https://kalarti.com${inmueble.portada_url}`,
        'datePosted': '2026-09-02',
        'offers': {
          '@type': 'Offer',
          'price': inmueble.precio,
          'priceCurrency': 'COP',
          'availability': 'https://schema.org/InStock',
          'url': `https://kalarti.com/propiedades/${inmueble.slug}`,
        },
        'address': {
          '@type': 'PostalAddress',
          'streetAddress': inmueble.direccion,
          'addressLocality': inmueble.ciudad,
          'addressRegion': inmueble.departamento,
          'addressCountry': 'CO',
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PropertyDetailClient inmueble={inmueble} relatedInmuebles={relatedInmuebles} />
    </>
  );
}
