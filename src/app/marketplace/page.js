'use client';

/* ============================================================
   Tienda virtual Kalarti — catálogo público
   Ofertas reales de mk_ofertas: CATALOGO (despacho directo del
   proveedor) y SOBRANTE (stock disponible en una obra).
   ============================================================ */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  fmt, norm, ofertaToProducto, readCart, writeCart, cartSubtotal, clampQty,
  loadOfertasPublicadas, TiendaHeader, ui,
} from './_lib/shared';

const POR_PAGINA = 24;

export default function MarketplacePage() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoria, setCategoria] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [origen, setOrigen] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [visibles, setVisibles] = useState(POR_PAGINA);
  const [cart, setCart] = useState([]);
  const [drawer, setDrawer] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const rows = await loadOfertasPublicadas();
        if (!vivo) return;
        setProductos(rows.map(ofertaToProducto).filter((p) => p.precio > 0 && (p.origen !== 'SOBRANTE' || p.stock > 0)));
      } catch {
        if (vivo) setError('No pudimos cargar el catálogo. Intenta de nuevo en unos minutos.');
      } finally {
        if (vivo) setLoading(false);
      }
    })();
    const sync = () => setCart(readCart());
    sync();
    window.addEventListener('kalarti-cart-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      vivo = false;
      window.removeEventListener('kalarti-cart-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  // Categorías y municipios desde los datos
  const categorias = useMemo(() => {
    const m = new Map();
    productos.forEach((p) => m.set(p.categoria, (m.get(p.categoria) || 0) + 1));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'));
  }, [productos]);

  const municipios = useMemo(() => {
    const m = new Map();
    productos.forEach((p) => { if (p.municipio) m.set(p.municipio, (m.get(p.municipio) || 0) + 1); });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'));
  }, [productos]);

  const filtrados = useMemo(() => {
    const q = norm(busqueda);
    const terms = q ? q.split(/\s+/).filter(Boolean) : [];
    return productos.filter((p) => {
      if (categoria && p.categoria !== categoria) return false;
      if (municipio && p.municipio !== municipio) return false;
      if (origen && p.origen !== origen) return false;
      if (terms.length) {
        const hay = norm(`${p.nombre} ${p.categoria}`);
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
  }, [productos, categoria, municipio, origen, busqueda]);

  // Reinicia la paginación al cambiar filtros
  const conReset = (fn) => (v) => { fn(v); setVisibles(POR_PAGINA); };
  const fCategoria = conReset(setCategoria);
  const fMunicipio = conReset(setMunicipio);
  const fOrigen = conReset(setOrigen);
  const fBusqueda = conReset(setBusqueda);

  const saveCart = useCallback((items) => { setCart(items); writeCart(items); }, []);

  const agregar = (p) => {
    const ex = cart.find((i) => i.id === p.id);
    const item = ex || {
      id: p.id, insumo_id: p.insumo_id, nombre: p.nombre, unidad: p.unidad, precio: p.precio,
      origen: p.origen, bodega_id: p.bodega_id, categoria: p.categoria, municipio: p.municipio,
      sector: p.sector, cantidad: 0, stock_max: p.origen === 'SOBRANTE' ? p.stock : null,
    };
    const cantidad = clampQty(item, (item.cantidad || 0) + 1);
    if (ex && cantidad === ex.cantidad) { setAviso('Alcanzaste el stock disponible de este sobrante.'); return; }
    saveCart(ex ? cart.map((i) => (i.id === p.id ? { ...i, cantidad } : i)) : [...cart, { ...item, cantidad }]);
    setAviso(`Agregado: ${p.nombre}`);
  };

  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(() => setAviso(''), 2200);
    return () => clearTimeout(t);
  }, [aviso]);

  const setCantidad = (id, qty) => saveCart(cart.map((i) => (i.id === id ? { ...i, cantidad: clampQty(i, qty) } : i)));
  const quitar = (id) => saveCart(cart.filter((i) => i.id !== id));
  const unidadesCart = cart.reduce((s, i) => s + Number(i.cantidad || 0), 0);
  const subtotal = cartSubtotal(cart);

  const chip = (activo) => ({
    padding: '7px 14px', borderRadius: 999, border: activo ? '1px solid #2563eb' : '1px solid #e2e8f0',
    background: activo ? '#2563eb' : 'white', color: activo ? 'white' : '#334155', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <TiendaHeader cartCount={unidadesCart} onCart={() => setDrawer(true)} />

      {/* Hero */}
      <header style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', color: 'white', padding: '40px 24px 32px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 34, fontWeight: 800, margin: '0 0 8px' }}>Materiales para tu obra</h1>
        <p style={{ fontSize: 16, color: '#dbeafe', margin: '0 auto 20px', maxWidth: 640 }}>
          Despacho directo del proveedor y sobrantes de obra a precio de liquidación.
        </p>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <input
            type="search"
            placeholder="Buscar producto o categoría…"
            value={busqueda}
            onChange={(e) => fBusqueda(e.target.value)}
            style={{ ...ui.input, flex: '1 1 320px', padding: '14px 16px', fontSize: 15, border: 'none' }}
          />
          <select value={municipio} onChange={(e) => fMunicipio(e.target.value)} style={{ ...ui.input, flex: '0 1 200px', padding: '14px 12px', border: 'none' }}>
            <option value="">📍 Todos los municipios</option>
            {municipios.map(([m, n]) => <option key={m} value={m}>{m} ({n})</option>)}
          </select>
        </div>
      </header>

      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 20px 64px' }}>
        {/* Categorías */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 12 }}>
          <button style={chip(!categoria)} onClick={() => fCategoria('')}>Todas ({productos.length})</button>
          {categorias.map(([c, n]) => (
            <button key={c} style={chip(categoria === c)} onClick={() => fCategoria(c)}>{c} ({n})</button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
          <div style={{ fontSize: 14, color: '#475569' }}>
            {loading ? 'Cargando catálogo…' : `${filtrados.length.toLocaleString('es-CO')} productos`}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={chip(origen === '')} onClick={() => fOrigen('')}>Todo</button>
            <button style={chip(origen === 'CATALOGO')} onClick={() => fOrigen('CATALOGO')}>🚚 Despacho directo</button>
            <button style={chip(origen === 'SOBRANTE')} onClick={() => fOrigen('SOBRANTE')}>🏗️ Sobrantes de obra</button>
          </div>
        </div>

        {error && <div style={{ ...ui.card, color: '#b91c1c', marginBottom: 16 }}>{error}</div>}

        {!loading && filtrados.length === 0 && !error && (
          <div style={{ ...ui.card, textAlign: 'center', color: '#64748b', padding: 48 }}>
            No encontramos productos con esos filtros.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 18 }}>
          {filtrados.slice(0, visibles).map((p) => (
            <article key={p.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.4 }}>{p.categoria}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.35, minHeight: 40 }}>{p.nombre}</h3>
              <div style={{ fontSize: 12, color: '#64748b' }}>Unidad: {p.unidad}</div>
              {p.origen === 'SOBRANTE' ? (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#92400e', background: '#fef3c7', padding: '4px 8px', borderRadius: 6, alignSelf: 'flex-start' }}>
                  Sobrante de obra · 📍 {p.municipio}{p.sector ? ` – ${p.sector}` : ''}
                </span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#166534', background: '#dcfce7', padding: '4px 8px', borderRadius: 6, alignSelf: 'flex-start' }}>
                  Despacho directo del proveedor
                </span>
              )}
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, paddingTop: 8 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{fmt(p.precio)}</div>
                  {p.origen === 'SOBRANTE' && <div style={{ fontSize: 11, color: '#64748b' }}>Disponibles: {p.stock}</div>}
                </div>
                <button onClick={() => agregar(p)} style={{ ...ui.btnPrimary, padding: '9px 14px', fontSize: 13 }}>Agregar</button>
              </div>
            </article>
          ))}
        </div>

        {visibles < filtrados.length && (
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <button style={ui.btnGhost} onClick={() => setVisibles((v) => v + POR_PAGINA)}>
              Ver más ({(filtrados.length - visibles).toLocaleString('es-CO')} restantes)
            </button>
          </div>
        )}
      </main>

      {aviso && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: 'white', padding: '10px 18px', borderRadius: 8, fontSize: 13, zIndex: 300 }}>
          {aviso}
        </div>
      )}

      {/* Carrito */}
      {drawer && (
        <div onClick={() => setDrawer(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 200 }}>
          <aside onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 'min(420px, 100%)', background: 'white', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Tu carrito</h2>
              <button onClick={() => setDrawer(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }} aria-label="Cerrar">×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {cart.length === 0 && <div style={{ color: '#64748b', textAlign: 'center', marginTop: 40 }}>Tu carrito está vacío.</div>}
              {cart.map((i) => (
                <div key={i.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{i.nombre}</div>
                  <div style={{ fontSize: 12, color: '#64748b', margin: '2px 0 8px' }}>
                    {fmt(i.precio)} / {i.unidad} · {i.origen === 'SOBRANTE' ? `Sobrante · ${i.municipio}` : 'Despacho directo'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button style={{ ...ui.btnGhost, padding: '4px 10px' }} onClick={() => setCantidad(i.id, i.cantidad - 1)}>−</button>
                    <input value={i.cantidad} onChange={(e) => setCantidad(i.id, e.target.value)} inputMode="numeric" style={{ ...ui.input, width: 64, textAlign: 'center', padding: '6px' }} />
                    <button style={{ ...ui.btnGhost, padding: '4px 10px' }} onClick={() => setCantidad(i.id, i.cantidad + 1)}>+</button>
                    <div style={{ marginLeft: 'auto', fontWeight: 700 }}>{fmt(i.precio * i.cantidad)}</div>
                    <button onClick={() => quitar(i.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>Quitar</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: 20, borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, marginBottom: 12 }}>
                <span>Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              <a
                href={cart.length ? '/marketplace/checkout' : undefined}
                style={{ ...ui.btnPrimary, display: 'block', textAlign: 'center', textDecoration: 'none', opacity: cart.length ? 1 : 0.5, pointerEvents: cart.length ? 'auto' : 'none' }}
              >
                Finalizar compra
              </a>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, textAlign: 'center' }}>El costo de envío se confirma al coordinar el despacho.</div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
