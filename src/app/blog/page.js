'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import metadata from '@/content/blog/metadata.json';

const CATEGORIES = [
  { id: 'todos', label: 'Todos los Artículos' },
  { id: 'arquitectonico', label: 'BIM & Arquitectura' },
  { id: 'bio-construccion', label: 'Bio-Construcción 🌿' },
  { id: 'estructural', label: 'Cálculo Estructural' },
  { id: 'hidrosanitario', label: 'Hidrosanitario & RCI' },
];

export default function BlogIndex() {
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');

  const articles = metadata.articles || [];

  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchesCat = selectedCategory === 'todos' || art.category === selectedCategory;
      const matchesSearch = 
        searchQuery.trim() === '' ||
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (art.author && art.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (art.tags && art.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchesCat && matchesSearch;
    });
  }, [articles, selectedCategory, searchQuery]);

  // Featured article is the first one or Buga House
  const featuredArticle = articles.find(a => a.slug === 'vivienda-campestre-lujo-ladera-buga-house') || articles[0];
  const gridArticles = filteredArticles.filter(a => selectedCategory !== 'todos' || searchQuery !== '' || a.slug !== featuredArticle?.slug);

  return (
    <div className="clean-blog-index">
      <style dangerouslySetInnerHTML={{ __html: `
        .blog-header-section {
          margin-bottom: 40px;
        }

        .blog-subtitle {
          color: var(--primary-gold-hover);
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }

        .blog-main-title {
          font-size: 44px;
          font-weight: 800;
          color: var(--primary-navy);
          letter-spacing: -1px;
          line-height: 1.15;
          margin-bottom: 16px;
        }

        .blog-main-desc {
          font-size: 18px;
          color: var(--text-muted);
          max-width: 720px;
          line-height: 1.6;
          margin-bottom: 32px;
        }

        .blog-controls-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          padding-bottom: 32px;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 40px;
        }

        .clean-category-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .clean-pill {
          background: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-muted);
          padding: 8px 18px;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .clean-pill:hover {
          border-color: var(--text-main);
          color: var(--text-main);
        }

        .clean-pill.active {
          background: var(--primary-navy);
          border-color: var(--primary-navy);
          color: #ffffff;
        }

        .clean-search-input {
          padding: 10px 18px;
          border-radius: 20px;
          border: 1px solid var(--border-color);
          background: var(--bg-light);
          font-size: 14px;
          color: var(--text-main);
          outline: none;
          min-width: 260px;
          transition: border-color 0.15s;
        }

        .clean-search-input:focus {
          border-color: var(--primary-navy);
          background: #ffffff;
        }

        /* FEATURED HERO CARD (Untitled UI Style) */
        .featured-hero-card {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          background: var(--primary-navy);
          margin-bottom: 56px;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
          display: block;
          text-decoration: none;
          color: #ffffff;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .featured-hero-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 24px 48px rgba(15, 23, 42, 0.16);
        }

        .featured-hero-img-wrap {
          height: 480px;
          position: relative;
        }

        .featured-hero-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: brightness(0.75);
          transition: transform 0.6s ease;
        }

        .featured-hero-card:hover .featured-hero-img-wrap img {
          transform: scale(1.03);
        }

        .featured-hero-overlay {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          padding: 48px;
          background: linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.6) 60%, transparent 100%);
        }

        .featured-tag {
          display: inline-block;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          padding: 4px 12px;
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .featured-title {
          font-size: 32px;
          font-weight: 800;
          line-height: 1.25;
          margin-bottom: 12px;
          color: #ffffff;
          letter-spacing: -0.5px;
        }

        .featured-excerpt {
          font-size: 16px;
          color: #cbd5e1;
          max-width: 800px;
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .featured-author-row {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          color: #e2e8f0;
        }

        .featured-author-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--primary-gold);
          color: var(--primary-navy);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 14px;
        }

        /* RECENT POSTS SECTION */
        .section-header-row {
          margin-bottom: 28px;
        }

        .section-header-title {
          font-size: 24px;
          font-weight: 800;
          color: var(--primary-navy);
          letter-spacing: -0.5px;
        }

        /* 3-COLUMN ARTICLE GRID */
        .clean-articles-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 36px;
          margin-bottom: 60px;
        }

        .clean-card {
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
          border-radius: 16px;
          overflow: hidden;
          transition: transform 0.2s ease;
        }

        .clean-card:hover {
          transform: translateY(-4px);
        }

        .clean-card-img-wrap {
          height: 220px;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 18px;
          background: var(--bg-subtle);
          position: relative;
        }

        .clean-card-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }

        .clean-card:hover .clean-card-img-wrap img {
          transform: scale(1.05);
        }

        .clean-card-meta {
          font-size: 13px;
          font-weight: 700;
          color: var(--primary-blue);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .clean-card-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--primary-navy);
          line-height: 1.35;
          margin-bottom: 10px;
          letter-spacing: -0.3px;
          transition: color 0.15s;
        }

        .clean-card:hover .clean-card-title {
          color: var(--primary-blue);
        }

        .clean-card-excerpt {
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.6;
          margin-bottom: 20px;
          flex-grow: 1;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .clean-card-author-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-top: 14px;
          border-top: 1px solid var(--border-subtle);
        }

        .clean-author-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--bg-subtle);
          border: 1px solid var(--border-color);
          color: var(--primary-navy);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 12px;
        }

        .clean-author-info {
          font-size: 13px;
        }

        .clean-author-name {
          font-weight: 700;
          color: var(--primary-navy);
          display: block;
        }

        .clean-post-date {
          color: var(--text-muted);
          font-size: 12px;
        }

        @media (max-width: 1024px) {
          .clean-articles-grid { grid-template-columns: repeat(2, 1fr); }
          .featured-hero-img-wrap { height: 400px; }
          .featured-title { font-size: 26px; }
        }

        @media (max-width: 640px) {
          .clean-articles-grid { grid-template-columns: 1fr; }
          .blog-main-title { font-size: 32px; }
          .featured-hero-img-wrap { height: 360px; }
          .featured-hero-overlay { padding: 24px; }
          .featured-title { font-size: 22px; }
        }
      `}} />

      {/* HEADER TITLE */}
      <section className="blog-header-section">
        <div className="blog-subtitle">KALARTI Insights & Casos de Estudio</div>
        <h1 className="blog-main-title">Arquitectura, Coordinación BIM & Bio-Construcción</h1>
        <p className="blog-main-desc">
          Artículos técnicos, coordinación interdisciplinaria en Revit MEP, soluciones sismorresistentes en Guadua y casos reales documentados por nuestro equipo de especialistas.
        </p>

        {/* CONTROLS */}
        <div className="blog-controls-row">
          <div className="clean-category-pills">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`clean-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            className="clean-search-input"
            placeholder="🔍 Buscar artículo o autor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </section>

      {/* FEATURED POST (Shown only when not filtering or searching) */}
      {selectedCategory === 'todos' && searchQuery === '' && featuredArticle && (
        <Link href={`/blog/${featuredArticle.slug}`} className="featured-hero-card">
          <div className="featured-hero-img-wrap">
            <img src={featuredArticle.image || '/icon.png'} alt={featuredArticle.title} />
            <div className="featured-hero-overlay">
              <span className="featured-tag">Artículo Destacado</span>
              <h2 className="featured-title">{featuredArticle.title}</h2>
              <p className="featured-excerpt">{featuredArticle.excerpt}</p>
              <div className="featured-author-row">
                <div className="featured-author-avatar">{featuredArticle.author?.charAt(0) || 'G'}</div>
                <div>
                  <strong>{featuredArticle.author}</strong>
                  <span style={{ margin: '0 8px', opacity: 0.6 }}>•</span>
                  <span>{featuredArticle.date}</span>
                  <span style={{ margin: '0 8px', opacity: 0.6 }}>•</span>
                  <span>{featuredArticle.readTime} lect.</span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* RECENT POSTS TITLE */}
      <div className="section-header-row">
        <h3 className="section-header-title">
          {selectedCategory === 'todos' && searchQuery === '' ? 'Publicaciones Recientes' : `Artículos (${filteredArticles.length})`}
        </h3>
      </div>

      {/* 3-COLUMN ARTICLES GRID */}
      {gridArticles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '16px', marginBottom: '12px' }}>No se encontraron artículos que coincidan con los criterios.</p>
          <button 
            onClick={() => { setSelectedCategory('todos'); setSearchQuery(''); }}
            className="clean-btn-cta"
          >
            Ver todos los artículos
          </button>
        </div>
      ) : (
        <div className="clean-articles-grid">
          {gridArticles.map((article) => (
            <Link key={article.slug} href={`/blog/${article.slug}`} className="clean-card">
              <div className="clean-card-img-wrap">
                <img 
                  src={article.image || '/icon.png'} 
                  alt={article.title} 
                />
              </div>
              <div className="clean-card-meta">{article.category}</div>
              <h4 className="clean-card-title">{article.title}</h4>
              <p className="clean-card-excerpt">{article.excerpt}</p>
              <div className="clean-card-author-row">
                <div className="clean-author-avatar">{article.author?.charAt(0) || 'K'}</div>
                <div className="clean-author-info">
                  <span className="clean-author-name">{article.author}</span>
                  <span className="clean-post-date">{article.date} • {article.readTime} lect.</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
