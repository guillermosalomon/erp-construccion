'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import metadata from '@/content/blog/metadata.json';

const CATEGORY_NAMES = {
  'bio-construccion': { name: 'Bio-Construcción & Guadua 🌿', desc: 'Diseño sostenible en Guadua Angustifolia Kunth, silvicultura, preservación con sales de boro, muros de tierra y arquitectura bioclimática.' },
  'estructural': { name: 'Cálculo Estructural & Sismo-Resistencia 📐', desc: 'Diseño sismo-resistente bajo norma NSR-10, memorias de cálculo para curadurías y coordinación estructural.' },
  'arquitectonico': { name: 'BIM Management & Diseño Arquitectónico 🎨', desc: 'Coordinación interdisciplinaria en Revit MEP, diseño de residencias de lujo, interiorismo, pieles de edificios y mobiliario a medida.' },
  'bim-3d': { name: 'BIM 5D & Visualización 3D 🖥️', desc: 'Modelado paramétrico, detección de interferencias, renders fotorrealistas en Twinmotion y recorridos virtuales.' },
  'hidrosanitario': { name: 'Redes Hidrosanitarias & RCI 💧', desc: 'Diseño de redes hidráulicas, sanitarias, pluviales y sistemas de protección contra incendios.' },
};

export default function CategoryPage() {
  const params = useParams();
  const categoria = params.categoria;

  const catInfo = CATEGORY_NAMES[categoria] || { name: categoria, desc: 'Publicaciones y casos de estudio sobre esta disciplina técnica.' };
  const articles = useMemo(() => {
    return (metadata.articles || []).filter((art) => art.category === categoria);
  }, [categoria]);

  return (
    <div className="clean-category-view">
      <style dangerouslySetInnerHTML={{ __html: `
        .clean-cat-header {
          margin-bottom: 40px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--border-color);
        }

        .clean-back-link {
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 16px;
          transition: color 0.15s;
        }

        .clean-back-link:hover {
          color: var(--primary-navy);
        }

        .clean-cat-title {
          font-size: 36px;
          font-weight: 800;
          color: var(--primary-navy);
          letter-spacing: -0.8px;
          margin-bottom: 10px;
        }

        .clean-cat-desc {
          font-size: 16px;
          color: var(--text-muted);
          max-width: 680px;
          line-height: 1.6;
        }

        .clean-cat-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 36px;
          margin-bottom: 60px;
        }

        .clean-cat-card {
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
          border-radius: 16px;
          overflow: hidden;
          transition: transform 0.2s ease;
        }

        .clean-cat-card:hover {
          transform: translateY(-4px);
        }

        .clean-cat-img-wrap {
          height: 220px;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 18px;
          background: var(--bg-subtle);
        }

        .clean-cat-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }

        .clean-cat-card:hover .clean-cat-img-wrap img {
          transform: scale(1.05);
        }

        .clean-cat-card-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--primary-navy);
          line-height: 1.35;
          margin-bottom: 10px;
        }

        .clean-cat-card-excerpt {
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.6;
          margin-bottom: 16px;
          flex-grow: 1;
        }

        .clean-cat-author-strip {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-top: 14px;
          border-top: 1px solid var(--border-subtle);
          font-size: 13px;
        }

        .clean-cat-avatar {
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

        @media (max-width: 900px) {
          .clean-cat-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 640px) {
          .clean-cat-grid { grid-template-columns: 1fr; }
          .clean-cat-title { font-size: 28px; }
        }
      `}} />

      <div className="clean-cat-header">
        <Link href="/blog" className="clean-back-link">
          ← Volver a todos los artículos
        </Link>
        <h1 className="clean-cat-title">{catInfo.name}</h1>
        <p className="clean-cat-desc">{catInfo.desc}</p>
      </div>

      {articles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <p>Aún no hay artículos publicados en esta categoría.</p>
        </div>
      ) : (
        <div className="clean-cat-grid">
          {articles.map((article) => (
            <Link key={article.slug} href={`/blog/${article.slug}`} className="clean-cat-card">
              <div className="clean-cat-img-wrap">
                <img src={article.image || '/icon.png'} alt={article.title} />
              </div>
              <h3 className="clean-cat-card-title">{article.title}</h3>
              <p className="clean-cat-card-excerpt">{article.excerpt}</p>
              <div className="clean-cat-author-strip">
                <div className="clean-cat-avatar">{article.author?.charAt(0) || 'K'}</div>
                <div>
                  <strong style={{ color: 'var(--primary-navy)', display: 'block' }}>{article.author}</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{article.date}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
