'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const mockProductos = [
  {
    id: '1',
    nombre: 'Cemento Argos Uso General 50kg',
    precio: 32000,
    categoria: 'Materiales',
    proveedor: 'Ferretería Central',
    imagen: '/api/placeholder/300/300',
    descripcion: 'Cemento de uso general para construcción.'
  },
  {
    id: '2',
    nombre: 'Acero Corrugado 1/2" x 6m',
    precio: 28500,
    categoria: 'Aceros',
    proveedor: 'Aceros de Colombia',
    imagen: '/api/placeholder/300/300',
    descripcion: 'Varilla de acero corrugado de alta resistencia.'
  },
  {
    id: '3',
    nombre: 'Ladrillo Prensado Rojo',
    precio: 1200,
    categoria: 'Obra Gris',
    proveedor: 'Ladrillera Santa Fe',
    imagen: '/api/placeholder/300/300',
    descripcion: 'Ladrillo prensado para fachadas y muros divisorios.'
  },
  {
    id: '4',
    nombre: 'Pintura Viniltex Blanco 5 Galones',
    precio: 250000,
    categoria: 'Acabados',
    proveedor: 'Pinturas y Color',
    imagen: '/api/placeholder/300/300',
    descripcion: 'Pintura acrílica de alta calidad para interiores y exteriores.'
  }
];

export default function MarketplaceProductos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriaFilter, setCategoriaFilter] = useState('Todas');
  const [paisFilter, setPaisFilter] = useState('Todas');

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    setLoading(true);
    try {
      // Obtenemos los productos publicados en el marketplace y unimos con insumos y tiendas
      const { data, error } = await supabase
        .from('mk_ofertas')
        .select(`
          *,
          insumo:insumos(*),
          tienda:mk_tiendas(nombre),
          punto_venta:mk_puntos_venta(ciudad)
        `)
        .eq('publicado_marketplace', true)
        .eq('activo', true)
        .order('created_at', { ascending: false })
        .limit(100);
        
      if (error) throw error;
      setProductos(data && data.length > 0 ? data : mockProductos);
    } catch (err) {
      console.error('Error fetching productos:', err);
      setProductos(mockProductos);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  };

  const categorias = ['Todas', 'Básicos', 'Aceros', 'Madera', 'Ferretería', 'Tuberías y Accesorios', 'Eléctricos', 'Herramientas', 'Agregados', 'Mampostería', 'Pinturas', 'Otros'];
  const paises = ['Colombia', 'USA', 'Brazil'];
  
  // Extraer ciudades dinámicamente de los productos cargados
  const ciudadesDisponibles = ['Todas', ...Array.from(new Set(productos.map(p => p.punto_venta?.ciudad || p.ciudad).filter(Boolean)))];

  const filteredProductos = productos.filter(p => {
    const catFinal = p.categoria || p.insumo?.categoria || 'General';
    const ciudadFinal = p.punto_venta?.ciudad || p.ciudad || '';
    const matchCat = categoriaFilter === 'Todas' || catFinal === categoriaFilter;
    const matchCiudad = paisFilter === 'Todas' || ciudadFinal === paisFilter; // Usamos paisFilter como state para ciudad temporalmente o lo renombramos a ciudadFilter
    return matchCat && matchCiudad;
  });

  const [selectedPais, setSelectedPais] = useState('Colombia');

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <style>{`
        .search-bar-flex {
          display: flex;
          gap: 8px;
          flex-direction: row;
        }
        @media (max-width: 768px) {
          .search-bar-flex {
            flex-direction: column !important;
          }
          nav {
            flex-direction: column;
            padding: 20px !important;
            gap: 12px;
          }
          .nav-links {
            flex-wrap: wrap;
            justify-content: center;
          }
        }
      `}</style>
      {/* HEADER PUBLICO */}
      <nav style={{ 
        background: '#0f172a', padding: '20px 40px', display: 'flex', 
        justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 
      }}>
        <Link href="/" style={{ fontSize: '24px', fontWeight: '800', color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/icon.png" alt="Kalarti Logo" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain' }} />
          KALARTI Materiales
        </Link>
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <select 
            value={selectedPais}
            onChange={(e) => setSelectedPais(e.target.value)}
            style={{ background: 'transparent', color: '#f8fafc', border: '1px solid #334155', padding: '6px 12px', borderRadius: '6px', outline: 'none', cursor: 'pointer' }}
          >
            {paises.map(p => <option key={p} value={p} style={{ color: '#0f172a' }}>🌎 {p}</option>)}
          </select>
          <Link href="/" style={{ color: '#f8fafc', textDecoration: 'none', fontWeight: '500' }}>Ecosistema</Link>
          <Link href="/propiedades" style={{ color: '#f8fafc', textDecoration: 'none', fontWeight: '500' }}>Inmuebles</Link>
          <Link href="/erp" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>Ingresar al ERP</Link>
        </div>
      </nav>

      {/* HERO BUSCADOR */}
      <div style={{ 
        background: 'linear-gradient(rgba(15,23,42,0.9), rgba(15,23,42,0.9)), url(/api/placeholder/1200/600) center/cover', 
        padding: '60px 40px', textAlign: 'center', color: 'white' 
      }}>
        <h1 style={{ fontSize: '40px', fontWeight: '800', marginBottom: '16px' }}>Encuentra materiales de construcción B2B/B2C</h1>
        <p style={{ fontSize: '18px', color: '#cbd5e1', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
          Compra directo a ferreterías y proveedores de la red Kalarti.
        </p>

        {/* Barra de Filtros */}
        <div className="search-bar-flex" style={{ 
          background: 'white', padding: '8px', borderRadius: '12px', 
          maxWidth: '900px', margin: '0 auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' 
        }}>
          <input 
            type="text" 
            placeholder="Ej. Cemento, Varilla, Pintura..." 
            style={{ flex: 1, padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '16px', outline: 'none' }} 
          />
          <select 
            value={paisFilter} 
            onChange={(e) => setPaisFilter(e.target.value)}
            style={{ width: '180px', padding: '0 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '16px', outline: 'none', background: '#f8fafc', fontWeight: 'bold', color: '#0f172a', cursor: 'pointer' }}
          >
            {ciudadesDisponibles.map(ciudad => (
              <option key={ciudad} value={ciudad}>📍 {ciudad}</option>
            ))}
          </select>
          <button style={{ background: '#3b82f6', color: 'white', padding: '16px 32px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}>
            Buscar
          </button>
        </div>
      </div>

      <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '40px' }}>
        
        {/* SIDEBAR CATEGORIAS */}
        <div style={{ width: '250px', flexShrink: 0 }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginBottom: '20px' }}>Categorías</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categorias.map(cat => (
              <button 
                key={cat}
                onClick={() => setCategoriaFilter(cat)}
                style={{ 
                  textAlign: 'left', padding: '12px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  background: categoriaFilter === cat ? '#eff6ff' : 'transparent',
                  color: categoriaFilter === cat ? '#2563eb' : '#475569',
                  fontWeight: categoriaFilter === cat ? 'bold' : '500',
                  transition: 'background 0.2s'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* GRID PRODUCTOS */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>
              {categoriaFilter === 'Todas' ? 'Todos los materiales' : categoriaFilter}
            </h2>
            <div style={{ color: '#64748b' }}>{filteredProductos.length} productos</div>
          </div>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Cargando catálogo...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {filteredProductos.map(producto => (
                <div 
                  key={producto.id} 
                  style={{ 
                    background: 'white', borderRadius: '16px', overflow: 'hidden',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', transition: 'all 0.3s', border: '1px solid #e2e8f0',
                    display: 'flex', flexDirection: 'column'
                  }}
                >
                  <div style={{ height: '200px', padding: '24px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '60px' }}>📦</div>
                  </div>
                  <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>
                      {producto.categoria || producto.insumo?.categoria || 'General'}
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '12px', flex: 1 }}>
                      {producto.nombre_comercial || producto.insumo?.nombre || producto.nombre}
                    </h3>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>
                      {formatCurrency(producto.precio_venta || producto.precio)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>
                      Vendido por: <strong>{producto.tienda?.nombre || producto.tienda_nombre || producto.proveedor}</strong>
                      <br/>📍 {producto.punto_venta?.ciudad || producto.ciudad}
                    </div>
                    <button style={{ width: '100%', background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => {e.target.style.background = '#0f172a'; e.target.style.color = 'white'}} onMouseOut={(e) => {e.target.style.background = '#f8fafc'; e.target.style.color = '#0f172a'}}>
                      Añadir al Carrito
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
