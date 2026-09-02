import metadata from '@/content/blog/metadata.json';
import { inmuebles } from '@/data/inmuebles';

export default async function sitemap() {
  const baseUrl = 'https://kalarti.com';

  const articles = metadata.articles || [];

  const articleUrls = articles.map((article) => ({
    url: `${baseUrl}/blog/${article.slug}`,
    lastModified: new Date(article.date || Date.now()),
    changeFrequency: 'weekly',
    priority: article.hub ? 0.9 : 0.8,
  }));

  const categorySlugs = ['bio-construccion', 'estructural', 'arquitectonico', 'bim-3d', 'hidrosanitario'];
  const categoryUrls = categorySlugs.map((cat) => ({
    url: `${baseUrl}/blog/categoria/${cat}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const propiedadUrls = inmuebles.map((inmueble) => ({
    url: `${baseUrl}/propiedades/${inmueble.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  const landingUrls = [
    '/landing/construccion',
    '/landing/bioconstruccion',
    '/landing/calculo-estructural-bogota',
    '/landing/diseno-arquitectonico-medellin',
    '/landing/construccion-residencial-cali',
    '/landing/diseno-estructural-pasto-narino',
    '/landing/bio-construccion-guadua-eje-cafetero',
    '/landing/diseno-arquitectonico-costa-rica',
    '/landing/diseno-estructural-panama',
    '/landing/diseno-arquitectonico-mexico',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/propiedades`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...propiedadUrls,
    ...articleUrls,
    ...categoryUrls,
    ...landingUrls,
  ];
}
