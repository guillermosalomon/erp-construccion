import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import metadata from '@/content/blog/metadata.json';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = metadata.articles.find((a) => a.slug === slug);
  
  if (!article) {
    return { title: 'Artículo no encontrado | KALARTI Blog' };
  }

  return {
    title: `${article.title} | KALARTI Blog`,
    description: article.excerpt,
    keywords: article.tags ? article.tags.join(', ') : '',
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      publishedTime: article.date,
      authors: [article.author],
      images: [article.image || '/icon.png'],
    },
  };
}

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const article = metadata.articles.find((a) => a.slug === slug);

  if (!article) {
    notFound();
  }

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

  // Find related articles
  const relatedArticles = metadata.articles.filter((a) => 
    a.slug !== article.slug && (article.relatedSlugs || []).includes(a.slug)
  );

  return (
    <div className="clean-article-view">
      <style dangerouslySetInnerHTML={{ __html: `
        .clean-article-container {
          max-width: 860px;
          margin: 0 auto;
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
          background: var(--bg-subtle);
          color: var(--primary-blue);
          border: 1px solid var(--border-color);
          padding: 4px 12px;
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
          line-height: 1.2;
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
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--primary-gold);
          color: var(--primary-navy);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 18px;
        }

        .clean-hero-img-wrap {
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 40px;
          background: var(--bg-subtle);
          max-height: 480px;
        }

        .clean-hero-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* Article Typography */
        .clean-article-body {
          font-size: 17px;
          line-height: 1.8;
          color: #334155;
        }

        .clean-article-body h2 {
          font-size: 26px;
          font-weight: 800;
          color: var(--primary-navy);
          margin: 40px 0 16px 0;
          letter-spacing: -0.4px;
        }

        .clean-article-body h3 {
          font-size: 20px;
          font-weight: 700;
          color: var(--primary-navy);
          margin: 28px 0 12px 0;
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

        .clean-callout {
          background: var(--bg-light);
          border-left: 4px solid var(--primary-gold);
          border-radius: 0 12px 12px 0;
          padding: 24px;
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
          max-width: 540px;
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
            <div className="clean-author-avatar-lg">{article.author?.charAt(0) || 'G'}</div>
            <div>
              <div style={{ color: 'var(--primary-navy)', fontWeight: 700, fontSize: '15px' }}>{article.author}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {article.authorTitle} · {article.date} · {article.readTime} de lectura
              </div>
            </div>
          </div>
        </header>

        {/* HERO IMAGE */}
        {article.image && (
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
                El desarrollo de proyectos con altos estándares de ingeniería y diseño arquitectónico exige un control riguroso de cada fase, integrando metodología BIM y análisis bioclimático adaptado al entorno.
              </p>
            </div>
          )}

          {/* CTA CARD */}
          <div className="clean-cta-card">
            <h3>¿Planificando un proyecto similar?</h3>
            <p>
              Habla directamente con el equipo de KALARTI para cotizar coordinación BIM, diseño arquitectónico o bio-construcción en guadua.
            </p>
            <a 
              href={`https://wa.me/573152717932?text=Hola,%20le%C3%AD%20el%20art%C3%ADculo%20"${encodeURIComponent(article.title)}"%20y%20deseo%20asesor%C3%ADa%20para%20un%20proyecto.`}
              target="_blank"
              rel="noopener noreferrer"
              className="clean-btn-wa-lg"
            >
              💬 Cotizar por WhatsApp Directo
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
        </div>
      </div>
    </div>
  );
}
