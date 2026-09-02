export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/blog/', '/landing/', '/marketplace/', '/propiedades/'],
        disallow: ['/erp/', '/api/', '/_next/'],
      },
    ],
    sitemap: 'https://kalarti.com/sitemap.xml',
  };
}
