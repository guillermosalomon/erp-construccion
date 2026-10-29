import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { inmuebles, getInmuebleBySlug, mergeCatalogWithDb } from '@/data/inmuebles';
import PropertyDetailClient from './PropertyDetailClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function fetchDbInmueblesServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client
      .from('inmuebles')
      .select('*, inmueble_fotos(*)')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const dbRows = await fetchDbInmueblesServer();
  const inmueble = getInmuebleBySlug(slug, dbRows);

  if (!inmueble) {
    return {
      title: 'Propiedad no encontrada | Kalarti',
      description: 'La propiedad solicitada no se encuentra disponible.',
    };
  }

  const siteUrl = 'https://www.kalarti.com';
  const canonicalUrl = `${siteUrl}/propiedades/${slug}`;
  const rawImg = inmueble.og_image_url || inmueble.portada_url || '/icon.png';
  const imageUrl = rawImg.startsWith('http') ? rawImg : `${siteUrl}${rawImg}`;

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
          secureUrl: imageUrl,
          width: 1200,
          height: 630,
          alt: inmueble.titulo,
          type: 'image/jpeg',
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
  const dbRows = await fetchDbInmueblesServer();
  const inmueble = getInmuebleBySlug(slug, dbRows);

  if (!inmueble) {
    notFound();
  }

  const allCatalog = mergeCatalogWithDb(dbRows, { onlyAvailable: true });
  const relatedInmuebles = allCatalog.filter((i) => i.slug !== inmueble.slug);

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
