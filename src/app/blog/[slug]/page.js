import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import metadata from '@/content/blog/metadata.json';

export async function generateStaticParams() {
  return (metadata.articles || []).map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = metadata.articles.find((a) => a.slug === slug);
  
  if (!article) {
    return { title: 'Artículo no encontrado | KALARTI Blog' };
  }

  const imageUrl = article.image 
    ? (article.image.startsWith('http') ? article.image : `https://kalarti.com${article.image}`)
    : 'https://kalarti.com/icon.png';

  return {
    title: `${article.title} | KALARTI Blog`,
    description: article.excerpt,
    keywords: article.tags ? article.tags.join(', ') : '',
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      url: `https://kalarti.com/blog/${slug}`,
      publishedTime: article.date,
      authors: [article.author],
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 675,
          alt: article.title,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt,
      images: [imageUrl],
    },
  };
}

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const article = metadata.articles.find((a) => a.slug === slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = (article.relatedSlugs || [])
    .map((s) => metadata.articles.find((a) => a.slug === s))
    .filter(Boolean);

  // Attempt to load corresponding HTML file from src/content/blog/
  let htmlContent = '';
  const htmlPath = path.join(process.cwd(), 'src', 'content', 'blog', `${slug}.html`);
  
  try {
    if (fs.existsSync(htmlPath)) {
      htmlContent = fs.readFileSync(htmlPath, 'utf8');
    }
  } catch (err) {
    console.error(`Could not read HTML file for ${slug}:`, err);
  }

  // Schema.org JSON-LD for BlogPosting
  const blogPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    author: {
      '@type': 'Person',
      name: article.author,
      jobTitle: article.authorTitle || 'Especialista KALARTI',
    },
    publisher: {
      '@type': 'Organization',
      name: 'KALARTI Constructores y Consultores S.A.S.',
      logo: {
        '@type': 'ImageObject',
        url: 'https://kalarti.com/icon.png',
      },
    },
  };

  // Schema.org FAQPage if FAQs exist
  const faqSchema = article.faq && article.faq.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: article.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  } : null;

  return (
    <div className="clean-article-view">
      <style dangerouslySetInnerHTML={{ __html: `
        .clean-article-container {
          max-width: 880px;
          margin: 0 auto;
          padding: 0 16px;
        }

        .clean-breadcrumbs {
          font-size: 14px;
          color: var(--text-muted);
          margin-bottom: 24px;
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .clean-breadcrumbs a {
          color: var(--text-muted);
          text-decoration: none;
          font-weight: 500;
        }
        .clean-breadcrumbs a:hover { color: var(--primary-navy); }

        .clean-article-header {
          margin-bottom: 32px;
        }

        .clean-category-badge {
          display: inline-block;
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #dbeafe;
          padding: 4px 14px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 16px;
        }

        .clean-article-h1 {
          font-size: 38px;
          font-weight: 800;
          line-height: 1.25;
          letter-spacing: -0.8px;
          color: var(--primary-navy);
          margin-bottom: 20px;
        }

        .clean-author-strip {
          display: flex;
          align-items: center;
          gap: 14px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 32px;
        }

        .clean-author-avatar-lg {
          width: 52px;
          height: 52px;
          min-width: 52px;
          min-height: 52px;
          max-width: 52px;
          max-height: 52px;
          flex-shrink: 0;
          aspect-ratio: 1 / 1;
          border-radius: 50%;
          background: #f1f5f9;
          border: 2px solid #d4a843;
          color: #1e3a8a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 19px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .clean-author-avatar-lg img {
          width: 100%;
          height: 100%;
          min-width: 100%;
          min-height: 100%;
          object-fit: cover;
          display: block;
          border-radius: 50%;
          aspect-ratio: 1 / 1;
        }

        .clean-hero-img-wrap {
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 36px;
          background: var(--bg-subtle);
          max-height: 500px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        }

        .clean-hero-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* PODCAST & AUDIO PLAYER */
        .clean-podcast-card {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-radius: 16px;
          padding: 24px 28px;
          margin-bottom: 36px;
          color: #ffffff;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);
        }

        .clean-podcast-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(212, 168, 67, 0.2);
          color: #d4a843;
          border: 1px solid rgba(212, 168, 67, 0.4);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .clean-podcast-title {
          font-size: 19px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 6px;
        }

        .clean-podcast-desc {
          font-size: 14px;
          color: #cbd5e1;
          margin-bottom: 18px;
        }

        .clean-audio-element {
          width: 100%;
          border-radius: 8px;
          outline: none;
        }

        /* VIDEO PLAYER */
        .clean-video-card {
          background: #0f172a;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 36px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.12);
        }

        .clean-video-header {
          padding: 16px 24px;
          background: #1e293b;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .clean-video-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #d4a843;
          font-size: 13px;
          font-weight: 700;
        }

        .clean-video-wrap {
          position: relative;
          width: 100%;
          background: #000;
        }

        .clean-video-element {
          width: 100%;
          display: block;
          max-height: 520px;
        }

        /* ARTICLE TYPOGRAPHY */
        .clean-article-body {
          font-size: 17px;
          line-height: 1.8;
          color: #334155;
        }

        .clean-article-body h2 {
          font-size: 26px;
          font-weight: 800;
          color: var(--primary-navy);
          margin: 44px 0 18px 0;
          letter-spacing: -0.4px;
        }

        .clean-article-body h3 {
          font-size: 20px;
          font-weight: 700;
          color: var(--primary-navy);
          margin: 30px 0 14px 0;
        }

        .clean-article-body p {
          margin-bottom: 22px;
        }

        .clean-article-body ul, .clean-article-body ol {
          margin: 0 0 24px 28px;
        }

        .clean-article-body li {
          margin-bottom: 10px;
        }

        /* FIGURES & CAPTIONS */
        .clean-article-body figure {
          margin: 36px 0;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,0.03);
        }

        .clean-article-body figure img {
          width: 100%;
          height: auto;
          display: block;
        }

        .clean-article-body figcaption {
          padding: 12px 18px;
          font-size: 13.5px;
          color: #64748b;
          font-style: italic;
          border-top: 1px solid #e2e8f0;
          background: #ffffff;
          line-height: 1.5;
        }

        .clean-callout {
          background: #f8fafc;
          border-left: 4px solid var(--primary-gold);
          border-radius: 0 12px 12px 0;
          padding: 22px 26px;
          margin: 36px 0;
        }

        .clean-callout h4 {
          color: var(--primary-navy);
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .clean-callout p {
          font-size: 15px;
          color: var(--text-muted);
          margin: 0;
        }

        /* TABLES */
        .clean-article-body table {
          width: 100%;
          border-collapse: collapse;
          margin: 32px 0;
          font-size: 14.5px;
        }

        .clean-article-body th {
          background: #0f172a;
          color: #ffffff;
          padding: 12px 16px;
          text-align: left;
          font-weight: 700;
        }

        .clean-article-body td {
          padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
          color: #334155;
        }

        .clean-article-body tr:nth-child(even) {
          background: #f8fafc;
        }

        /* CTA BOX */
        .clean-cta-card {
          background: var(--primary-navy);
          color: #ffffff;
          border-radius: 16px;
          padding: 36px;
          margin: 48px 0;
          text-align: center;
        }

        .clean-cta-card h3 {
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 10px;
          color: #ffffff;
        }

        .clean-cta-card p {
          color: #cbd5e1;
          font-size: 15px;
          max-width: 560px;
          margin: 0 auto 24px auto;
        }

        .clean-btn-wa-lg {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--primary-gold);
          color: var(--primary-navy);
          padding: 14px 28px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 15px;
          text-decoration: none;
          transition: background 0.15s;
        }

        .clean-btn-wa-lg:hover {
          background: var(--primary-gold-hover);
        }

        /* FAQ */
        .clean-faq-section {
          background: var(--bg-light);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 32px;
          margin-top: 48px;
        }

        .clean-faq-title {
          font-size: 22px;
          font-weight: 800;
          color: var(--primary-navy);
          margin-bottom: 24px;
        }

        .clean-faq-item {
          margin-bottom: 18px;
          padding-bottom: 18px;
          border-bottom: 1px solid var(--border-color);
        }

        .clean-faq-item:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }

        .clean-faq-q {
          font-size: 16px;
          font-weight: 700;
          color: var(--primary-navy);
          margin-bottom: 8px;
        }

        .clean-faq-a {
          font-size: 15px;
          color: var(--text-muted);
          line-height: 1.6;
        }

        @media (max-width: 640px) {
          .clean-article-h1 { font-size: 28px; }
          .clean-cta-card { padding: 24px; }
          .clean-podcast-card { padding: 18px 20px; }
        }
      `}} />

      {/* Schema Injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <div className="clean-article-container">
        {/* BREADCRUMBS */}
        <div className="clean-breadcrumbs">
          <Link href="/">Inicio</Link> ➔ <Link href="/blog">Blog</Link> ➔ <span>{article.category}</span>
        </div>

        {/* HEADER */}
        <header className="clean-article-header">
          <span className="clean-category-badge">{article.category}</span>
          <h1 className="clean-article-h1">{article.title}</h1>
          <div className="clean-author-strip">
            <div className="clean-author-avatar-lg">
              {(() => {
                let photo = null;
                const n = (article.author || '').toLowerCase();
                if (n.includes('david') && n.includes('garc')) photo = '/team/david-garces.jpg';
                else if (n.includes('ana') || n.includes('garc')) photo = '/team/ana-garces.jpg';
                else if (n.includes('sandra') || n.includes('paz jojoa')) photo = '/team/sandra-paz.jpg';
                else if (n.includes('salomon') || n.includes('guillermo')) photo = '/team/guillermo-salomon.jpg';
                else if (n.includes('jaime') || n.includes('jaime andr')) photo = '/team/jaime-paz.jpg';
                else if (n.includes('juan camilo') || n.includes('enriquez')) photo = '/team/juan-camilo.jpg';
                
                return photo ? (
                  <img src={photo} alt={article.author} />
                ) : (
                  <span>{article.author?.charAt(0) || 'K'}</span>
                );
              })()}
            </div>
            <div>
              <div style={{ color: 'var(--primary-navy)', fontWeight: 700, fontSize: '15px' }}>{article.author}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {article.authorTitle} · {article.date} · {article.readTime} de lectura
              </div>
            </div>
          </div>
        </header>

        {/* PODCAST / AUDIO PLAYER (IF AVAILABLE) */}
        {article.audio && (
          <div className="clean-podcast-card">
            <div className="clean-podcast-badge">🎧 Entrevista Técnica / Podcast</div>
            <h3 className="clean-podcast-title">{article.audioTitle || 'Escucha el análisis técnico con la especialista'}</h3>
            <p className="clean-podcast-desc">
              Episodio exclusivo con la {article.author} ({article.authorTitle}). Reproduce el audio mientras lees el análisis a continuación:
            </p>
            <audio controls className="clean-audio-element" preload="metadata">
              <source src={article.audio} type="audio/mp4" />
              <source src={article.audio} type="audio/x-m4a" />
              Tu navegador no soporta el reproductor de audio.
            </audio>
          </div>
        )}

        {/* VIDEO PLAYER (IF AVAILABLE) */}
        {article.video && (
          <div className="clean-video-card">
            <div className="clean-video-header">
              <span className="clean-video-badge">🎬 Masterclass en Video</span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Ing. Ana Cristina Garcés</span>
            </div>
            <div className="clean-video-wrap">
              <video controls preload="metadata" poster={article.image} className="clean-video-element">
                <source src={article.video} type="video/mp4" />
                Tu navegador no soporta reproducción de video.
              </video>
            </div>
          </div>
        )}

        {/* HERO IMAGE (IF NO VIDEO OR AS COMPLEMENT) */}
        {article.image && !article.video && (
          <div className="clean-hero-img-wrap">
            <img src={article.image} alt={article.title} />
          </div>
        )}

        {/* ARTICLE CONTENT */}
        <div className="clean-article-body">
          {htmlContent ? (
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          ) : (
            <div>
              <p style={{ fontSize: '19px', color: 'var(--primary-navy)', fontWeight: 500, lineHeight: 1.6 }}>
                {article.excerpt}
              </p>
              <h2>1. Planteamiento Técnico y Contexto</h2>
              <p>
                El desarrollo de proyectos con altos estándares de ingeniería y diseño exige un control riguroso de cada fase, integrando metodología BIM y análisis hidrológico avanzado.
              </p>
            </div>
          )}

          {/* CTA CARD */}
          <div className="clean-cta-card">
            <h3>{article.cta?.title || '¿Requieres consultoría hidrológica o diseño de redes?'}</h3>
            <p>
              {article.cta?.desc || 'Habla directamente con la Ing. Ana Cristina Garcés y el equipo de KALARTI para cotizar estudios de inundabilidad, modelación hidrológica, redes HDS o contra incendio.'}
            </p>
            <a 
              href={`https://wa.me/573152717932?text=${encodeURIComponent(article.cta?.message || `Hola, leí el artículo "${article.title}" y deseo asesoría técnica con el equipo de KALARTI.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="clean-btn-wa-lg"
            >
              {article.cta?.buttonText || '💬 Consultar con la Especialista por WhatsApp'}
            </a>
          </div>

          {/* FAQS */}
          {article.faq && article.faq.length > 0 && (
            <section className="clean-faq-section">
              <h3 className="clean-faq-title">Preguntas Frecuentes</h3>
              {article.faq.map((item, idx) => (
                <div key={idx} className="clean-faq-item">
                  <div className="clean-faq-q">❓ {item.question}</div>
                  <div className="clean-faq-a">{item.answer}</div>
                </div>
              ))}
            </section>
          )}

          {/* RELATED ARTICLES */}
          {relatedArticles.length > 0 && (
            <section className="clean-related-section" style={{ marginTop: '56px', paddingTop: '40px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#b48528', marginBottom: '8px' }}>
                Investigación &amp; Criterios Técnicos
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '24px', letterSpacing: '-0.3px' }}>
                Lecturas Complementarias
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '22px' }}>
                {relatedArticles.map((rel) => (
                  <Link key={rel.slug} href={`/blog/${rel.slug}`} style={{ textDecoration: 'none', color: 'inherit', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease' }}>
                    <div style={{ height: '150px', borderRadius: '10px', overflow: 'hidden', marginBottom: '14px', background: '#e2e8f0' }}>
                      <img src={rel.image || '/icon.png'} alt={rel.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      {rel.category}
                    </span>
                    <h4 style={{ fontSize: '15.5px', fontWeight: 750, color: '#0f172a', lineHeight: 1.35, marginBottom: '10px' }}>
                      {rel.title}
                    </h4>
                    <span style={{ fontSize: '12.5px', color: '#64748b', marginTop: 'auto', fontWeight: 600 }}>
                      {rel.readTime} de lectura →
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
