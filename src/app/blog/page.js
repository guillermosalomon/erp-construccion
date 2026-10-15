'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import metadata from '@/content/blog/metadata.json';

const CATEGORIES = [
  { id: 'todos', label: 'Todos' },
  { id: 'hidraulica-sig', label: 'Hidráulica, SIG & Territorio' },
  { id: 'bim-mep', label: 'BIM Interdisciplinario & Coordinación MEP' },
  { id: 'bioconstruccion', label: 'Bio-Construcción & Arquitectura Sostenible' },
  { id: 'normativa-riesgo', label: 'Normativa & Gestión del Riesgo' },
];

export default function BlogIndex() {
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');

  const articles = metadata.articles || [];

  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchesCat = 
        selectedCategory === 'todos' || 
        (art.categoryIds && art.categoryIds.includes(selectedCategory));

      const matchesSearch = 
        searchQuery.trim() === '' ||
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (art.author && art.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (art.tags && art.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));

      return matchesCat && matchesSearch;
    });
  }, [articles, selectedCategory, searchQuery]);

  // Featured article is the POT Pasto strategic piece
  const featuredArticle = articles.find(a => a.slug === 'peligro-oculto-pot-pasto-planear-clima-pasado-riesgo-inundaciones') || articles[0];
  const isDefaultView = selectedCategory === 'todos' && searchQuery === '';
  const gridArticles = filteredArticles.filter(a => !isDefaultView || a.slug !== featuredArticle?.slug);

  return (
    <div className="clean-blog-index">
      <style dangerouslySetInnerHTML={{ __html: `
        .clean-blog-index {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px 20px 80px 20px;
        }

        .blog-header-section {
          margin-bottom: 36px;
        }

        .blog-subtitle {
          color: var(--primary-gold-hover, #b48528);
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .blog-main-title {
          font-size: 42px;
          font-weight: 850;
          color: var(--primary-navy, #0f172a);
          letter-spacing: -0.9px;
          line-height: 1.18;
          margin-bottom: 16px;
        }

        .blog-main-desc {
          font-size: 17.5px;
          color: var(--text-muted, #475569);
          max-width: 820px;
          line-height: 1.65;
          margin-bottom: 36px;
        }

        .blog-controls-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          padding-bottom: 28px;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
          margin-bottom: 40px;
        }

        .clean-category-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .clean-pill {
          background: #f8fafc;
          border: 1px solid var(--border-color, #e2e8f0);
          color: var(--text-muted, #475569);
          padding: 8px 18px;
          border-radius: 24px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .clean-pill:hover {
          border-color: var(--primary-navy, #0f172a);
          color: var(--primary-navy, #0f172a);
          background: #ffffff;
        }

        .clean-pill.active {
          background: var(--primary-navy, #0f172a);
          border-color: var(--primary-navy, #0f172a);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
        }

        .clean-search-input {
          padding: 10px 18px;
          border-radius: 20px;
          border: 1px solid var(--border-color, #e2e8f0);
          background: var(--bg-light, #f8fafc);
          font-size: 14px;
          color: var(--text-main, #0f172a);
          outline: none;
          min-width: 260px;
          transition: border-color 0.2s, background 0.2s;
        }

        .clean-search-input:focus {
          border-color: var(--primary-navy, #0f172a);
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
        }

        /* FEATURED SPLIT HERO CARD */
        .featured-split-card {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 0;
          background: #0f172a;
          border-radius: 20px;
          overflow: hidden;
          margin-bottom: 56px;
          box-shadow: 0 20px 45px rgba(15, 23, 42, 0.16);
          text-decoration: none;
          color: #ffffff;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .featured-split-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 25px 55px rgba(15, 23, 42, 0.22);
        }

        .featured-split-media {
          position: relative;
          min-height: 440px;
          background: #090d16;
          overflow: hidden;
        }

        .featured-split-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.6s ease;
        }

        .featured-split-card:hover .featured-split-media img {
          transform: scale(1.03);
        }

        .featured-split-media-badge {
          position: absolute;
          top: 20px;
          left: 20px;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(212, 168, 67, 0.6);
          color: #d4a843;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        .featured-split-content {
          padding: 44px 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%);
        }

        .featured-editorial-tag {
          display: inline-block;
          color: #d4a843;
          font-size: 12.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 12px;
        }

        .featured-split-title {
          font-size: 28px;
          font-weight: 800;
          line-height: 1.28;
          color: #ffffff;
          margin-bottom: 16px;
          letter-spacing: -0.4px;
        }

        .featured-split-excerpt {
          font-size: 15px;
          color: #cbd5e1;
          line-height: 1.65;
          margin-bottom: 24px;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .featured-split-author-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-top: 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          margin-bottom: 24px;
        }

        .featured-author-avatar-split {
          width: 44px;
          height: 44px;
          min-width: 44px;
          min-height: 44px;
          max-width: 44px;
          max-height: 44px;
          flex-shrink: 0;
          aspect-ratio: 1 / 1;
          border-radius: 50%;
          border: 2px solid #d4a843;
          background: #ffffff;
          overflow: hidden;
        }

        .featured-author-avatar-split img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          border-radius: 50%;
          aspect-ratio: 1 / 1;
        }

        .featured-split-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #d4a843;
          color: #0f172a;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 14px;
          width: fit-content;
          transition: background 0.15s ease, transform 0.15s ease;
        }

        .featured-split-card:hover .featured-split-cta-btn {
          background: #e2ba58;
          transform: translateX(4px);
        }

        /* CAPACIDADES KALARTI (SERVICE SHOWCASE) */
        .capacities-section {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 40px;
          margin-bottom: 60px;
        }

        .capacities-header {
          text-align: center;
          max-width: 760px;
          margin: 0 auto 36px auto;
        }

        .capacities-sub {
          color: #b48528;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 8px;
        }

        .capacities-title {
          font-size: 26px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 10px;
          letter-spacing: -0.5px;
        }

        .capacities-desc {
          font-size: 15px;
          color: #64748b;
          line-height: 1.6;
        }

        .capacities-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .capacity-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          transition: all 0.2s ease;
          position: relative;
        }

        .capacity-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
          transform: translateY(-3px);
        }

        .capacity-icon-wrap {
          font-size: 26px;
          margin-bottom: 12px;
          display: inline-block;
        }

        .capacity-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #2563eb;
          background: #eff6ff;
          padding: 3px 8px;
          border-radius: 10px;
          margin-bottom: 12px;
          width: fit-content;
        }

        .capacity-card-title {
          font-size: 16px;
          font-weight: 750;
          color: #0f172a;
          line-height: 1.35;
          margin-bottom: 10px;
        }

        .capacity-card-p {
          font-size: 13.5px;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 18px;
          flex-grow: 1;
        }

        .capacity-card-link {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-top: 1px solid #f1f5f9;
          padding-top: 12px;
          cursor: pointer;
        }

        .capacity-card-link:hover {
          color: #b48528;
        }

        /* 3-COLUMN ARTICLE GRID */
        .section-header-row {
          margin-bottom: 28px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .section-header-title {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
        }

        .clean-articles-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          margin-bottom: 60px;
        }

        .clean-card {
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
          border-radius: 16px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 16px;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .clean-card:hover {
          transform: translateY(-4px);
          border-color: #cbd5e1;
          box-shadow: 0 12px 30px rgba(0,0,0,0.06);
        }

        .clean-card-img-wrap {
          height: 210px;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 16px;
          background: #f1f5f9;
          position: relative;
        }

        .clean-card-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }

        .clean-card:hover .clean-card-img-wrap img {
          transform: scale(1.04);
        }

        .clean-card-meta {
          font-size: 11.5px;
          font-weight: 700;
          color: #2563eb;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .clean-card-title {
          font-size: 18.5px;
          font-weight: 750;
          color: #0f172a;
          line-height: 1.35;
          margin-bottom: 10px;
          letter-spacing: -0.3px;
          transition: color 0.15s;
        }

        .clean-card:hover .clean-card-title {
          color: #1e40af;
        }

        .clean-card-excerpt {
          font-size: 13.5px;
          color: #64748b;
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
          border-top: 1px solid #f1f5f9;
        }

        .clean-author-avatar {
          width: 36px;
          height: 36px;
          min-width: 36px;
          min-height: 36px;
          max-width: 36px;
          max-height: 36px;
          flex-shrink: 0;
          aspect-ratio: 1 / 1;
          border-radius: 50%;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
          overflow: hidden;
        }

        .clean-author-avatar img {
          width: 100%;
          height: 100%;
          min-width: 100%;
          min-height: 100%;
          object-fit: cover;
          display: block;
          border-radius: 50%;
          aspect-ratio: 1 / 1;
        }

        .clean-author-info {
          font-size: 12.5px;
        }

        .clean-author-name {
          font-weight: 700;
          color: #0f172a;
          display: block;
        }

        .clean-post-date {
          color: #94a3b8;
          font-size: 11.5px;
        }

        @media (max-width: 1080px) {
          .featured-split-card { grid-template-columns: 1fr; }
          .featured-split-media { min-height: 320px; }
          .capacities-grid { grid-template-columns: repeat(2, 1fr); }
          .clean-articles-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 640px) {
          .blog-main-title { font-size: 30px; }
          .featured-split-title { font-size: 22px; }
          .featured-split-content { padding: 28px 22px; }
          .capacities-section { padding: 24px 16px; }
          .capacities-grid { grid-template-columns: 1fr; }
          .clean-articles-grid { grid-template-columns: 1fr; }
          .clean-search-input { width: 100%; }
        }
      `}} />

      {/* HEADER TITLE */}
      <section className="blog-header-section">
        <div className="blog-subtitle">Perspectiva KALARTI</div>
        <h1 className="blog-main-title">Territorio, Ingeniería Digital &amp; Bio-Arquitectura</h1>
        <p className="blog-main-desc">
          Artículos técnicos, investigación aplicada y criterios de diseño sobre modelación hidrológica de cuencas, coordinación interdisciplinaria BIM (Arquitectura, Estructura, MEP) y bio-construcción sostenible.
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

      {/* FEATURED POST (SPLIT HERO - SHOWN IN DEFAULT VIEW OR WHEN SEARCH MATCHES) */}
      {isDefaultView && featuredArticle && (
        <Link href={`/blog/${featuredArticle.slug}`} className="featured-split-card">
          <div className="featured-split-media">
            <img src={featuredArticle.image || '/icon.png'} alt={featuredArticle.title} />
            <div className="featured-split-media-badge">
              <span>⭐ Artículo Destacado</span>
            </div>
          </div>
          <div className="featured-split-content">
            <span className="featured-editorial-tag">
              {featuredArticle.featuredTag || 'Planificación Territorial & Modelación Hidráulica'}
            </span>
            <h2 className="featured-split-title">{featuredArticle.title}</h2>
            <p className="featured-split-excerpt">{featuredArticle.excerpt}</p>
            
            <div className="featured-split-author-bar">
              <div className="featured-author-avatar-split">
                {(() => {
                  const n = (featuredArticle.author || '').toLowerCase();
                  let photo = null;
                  if (n.includes('david') && n.includes('garc')) photo = '/team/david-garces.jpg';
                  else if (n.includes('ana') || n.includes('garc')) photo = '/team/ana-garces.jpg';
                  else if (n.includes('sandra') || n.includes('paz jojoa')) photo = '/team/sandra-paz.jpg';
                  else if (n.includes('salomon') || n.includes('guillermo')) photo = '/team/guillermo-salomon.jpg';
                  else if (n.includes('jaime') || n.includes('jaime andr')) photo = '/team/jaime-paz.jpg';
                  else if (n.includes('juan camilo') || n.includes('enriquez')) photo = '/team/juan-camilo.jpg';
                  return photo ? <img src={photo} alt={featuredArticle.author} /> : <span>{featuredArticle.author?.charAt(0) || 'K'}</span>;
                })()}
              </div>
              <div>
                <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '14px' }}>{featuredArticle.author}</div>
                <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                  {featuredArticle.authorTitle ? 'Directora de Proyectos KALARTI' : 'Especialista KALARTI'} · {featuredArticle.readTime} de lectura
                </div>
              </div>
            </div>

            <div className="featured-split-cta-btn">
              Leer artículo completo →
            </div>
          </div>
        </Link>
      )}

      {/* BLOQUE INTERMEDIO DE CAPACIDADES KALARTI */}
      {isDefaultView && (
        <section className="capacities-section">
          <div className="capacities-header">
            <div className="capacities-sub">Ingeniería &amp; Consultoría Multidisciplinaria</div>
            <h3 className="capacities-title">Capacidades Técnicas KALARTI</h3>
            <p className="capacities-desc">
              Articulamos el diseño de vanguardia con rigor computacional y normativo para proyectos de infraestructura, ordenamiento territorial y edificación de alto impacto.
            </p>
          </div>

          <div className="capacities-grid">
            {/* 1. BIM */}
            <div className="capacity-card">
              <span className="capacity-icon-wrap">📐</span>
              <span className="capacity-badge">Revit MEP &amp; OpenBIM</span>
              <h4 className="capacity-card-title">Coordinación Interdisciplinaria BIM (Arc + Est + MEP)</h4>
              <p className="capacity-card-p">
                Detección temprana de interferencias, gemelos digitales y precisión constructiva unificando disciplinas arquitectónicas, estructurales e hidrosanitarias/eléctricas en modelos coordinados.
              </p>
              <Link href="/landing/construccion" className="capacity-card-link">
                Conocer servicios BIM →
              </Link>
            </div>

            {/* 2. HIDRAULICA */}
            <div className="capacity-card">
              <span className="capacity-icon-wrap">🌊</span>
              <span className="capacity-badge">Iber &amp; HEC-RAS 2D</span>
              <h4 className="capacity-card-title">Modelación de Cuencas e Infraestructura Hidráulica</h4>
              <p className="capacity-card-p">
                Simulación hidrológica (HEC-HMS), modelación hidrodinámica 2D (Iber, HEC-RAS 2D), delimitación de rondas hídricas, fajas de flujo preferente y drenaje urbano resiliente.
              </p>
              <button 
                onClick={() => setSelectedCategory('hidraulica-sig')} 
                className="capacity-card-link"
                style={{ background: 'none', border: 'none', paddingLeft: 0, textAlign: 'left', font: 'inherit' }}
              >
                Ver artículos hidráulicos →
              </button>
            </div>

            {/* 3. BIO-CONSTRUCCION */}
            <div className="capacity-card">
              <span className="capacity-icon-wrap">🎋</span>
              <span className="capacity-badge">Guadua &amp; SbN</span>
              <h4 className="capacity-card-title">Bio-Construcción y Arquitectura Bioclimática</h4>
              <p className="capacity-card-p">
                Soluciones basadas en la naturaleza (SbN), materiales de baja huella de carbono, eficiencia pasiva y armonía ambiental adaptada a las características del paisaje.
              </p>
              <Link href="/landing/bio-construccion-guadua-eje-cafetero" className="capacity-card-link">
                Ver obras en Guadua →
              </Link>
            </div>

            {/* 4. TERRITORIAL & SIG */}
            <div className="capacity-card">
              <span className="capacity-icon-wrap">🗺️</span>
              <span className="capacity-badge">QGIS &amp; Gestión de Riesgo</span>
              <h4 className="capacity-card-title">Planeamiento Territorial y SIG</h4>
              <p className="capacity-card-p">
                Análisis geoespacial de amenazas y vulnerabilidades para POT/PBOT, zonificación ambiental y planes maestros de recuperación de ejes hídricos urbanos.
              </p>
              <button 
                onClick={() => setSelectedCategory('normativa-riesgo')} 
                className="capacity-card-link"
                style={{ background: 'none', border: 'none', paddingLeft: 0, textAlign: 'left', font: 'inherit' }}
              >
                Ver publicaciones POT →
              </button>
            </div>
          </div>
        </section>
      )}

      {/* RECENT POSTS TITLE */}
      <div className="section-header-row">
        <h3 className="section-header-title">
          {isDefaultView ? 'Todos los Artículos Técnicos' : `Resultados (${filteredArticles.length})`}
        </h3>
        {selectedCategory !== 'todos' && (
          <button 
            onClick={() => { setSelectedCategory('todos'); setSearchQuery(''); }}
            style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, fontSize: '13.5px', cursor: 'pointer' }}
          >
            ← Restablecer filtros
          </button>
        )}
      </div>

      {/* 3-COLUMN ARTICLES GRID */}
      {gridArticles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '16px', marginBottom: '12px' }}>No se encontraron artículos que coincidan con la búsqueda o categoría seleccionada.</p>
          <button 
            onClick={() => { setSelectedCategory('todos'); setSearchQuery(''); }}
            className="clean-pill active"
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
                <div className="clean-author-avatar">
                  {(() => {
                    const n = (article.author || '').toLowerCase();
                    let photo = null;
                    if (n.includes('david') && n.includes('garc')) photo = '/team/david-garces.jpg';
                    else if (n.includes('ana') || n.includes('garc')) photo = '/team/ana-garces.jpg';
                    else if (n.includes('sandra') || n.includes('paz jojoa')) photo = '/team/sandra-paz.jpg';
                    else if (n.includes('salomon') || n.includes('guillermo')) photo = '/team/guillermo-salomon.jpg';
                    else if (n.includes('jaime') || n.includes('jaime andr')) photo = '/team/jaime-paz.jpg';
                    else if (n.includes('juan camilo') || n.includes('enriquez')) photo = '/team/juan-camilo.jpg';
                    return photo ? <img src={photo} alt={article.author} /> : <span>{article.author?.charAt(0) || 'K'}</span>;
                  })()}
                </div>
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
