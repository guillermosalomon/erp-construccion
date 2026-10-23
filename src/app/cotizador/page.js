'use client';

import { useState, useEffect, useMemo, useRef, useTransition } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  detectCurrency,
  saveCurrency,
  formatMoney,
  DRAFT_KEY,
  AIU,
  UBICACIONES_COTIZADOR,
} from '@/lib/cotizador/config';
import { calcularPresupuesto, agruparPorCapitulo, calcularCronograma } from '@/lib/cotizador/engine';
import ItemPickerModal from '@/components/cotizador/ItemPickerModal';
import MiniGanttView from '@/components/cotizador/MiniGanttView';
import SaveProjectModal from '@/components/cotizador/SaveProjectModal';
import PlansAndPayModal from '@/components/cotizador/PlansAndPayModal';
import './cotizador.css';

export default function CotizadorPage() {
  const { user } = useAuth();

  // Estados principales
  const [currency, setCurrency] = useState('COP');
  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'resumen' | 'gantt'
  const [catalogo, setCatalogo] = useState([]);
  const [cuadrillas, setCuadrillas] = useState([]);
  const [loadingCat, setLoadingCat] = useState(true);

  // Proyecto actual
  const [proyectoNombre, setProyectoNombre] = useState('Mi Proyecto de Construcción');
  const [ubicacion, setUbicacion] = useState('Pasto (Nariño) - Sede Principal');
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().split('T')[0]);
  const [numCuadrillas, setNumCuadrillas] = useState(1);
  const [items, setItems] = useState([]); // [{ apu_id, cantidad }]

  // Modales
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  // Detección inicial de moneda y carga de borrador
  useEffect(() => {
    setCurrency(detectCurrency());

    // Cargar borrador de localStorage si existe
    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.nombre) setProyectoNombre(parsed.nombre);
        if (parsed.fechaInicio) setFechaInicio(parsed.fechaInicio);
        if (parsed.numCuadrillas) setNumCuadrillas(parsed.numCuadrillas);
        if (Array.isArray(parsed.items) && parsed.items.length > 0) setItems(parsed.items);
      }
    } catch (e) {
      console.warn('Error leyendo borrador:', e);
    }
  }, []);

  // Cargar catálogo desde la API pública (precios del POS de la zona seleccionada)
  const primeraCargaCat = useRef(true);
  useEffect(() => {
    const primera = primeraCargaCat.current;
    primeraCargaCat.current = false;
    fetch(`/api/cotizador/catalogo?municipio=${encodeURIComponent(ubicacion)}`)
      .then(res => res.json())
      .then(data => {
        if (data.catalogo) setCatalogo(data.catalogo);
        if (data.cuadrillas) setCuadrillas(data.cuadrillas);
        setLoadingCat(false);

        // Descartar ítems del borrador que ya no están publicados en el catálogo
        if (Array.isArray(data.catalogo) && data.catalogo.length > 0) {
          const ids = new Set(data.catalogo.map(c => c.id));
          setItems(prev => prev.filter(it => ids.has(it.apu_id)));
        }

        // Si no hay ítems y es primera vez, precargar una plantilla básica de bienvenida
        try {
          const hasDraft = window.localStorage.getItem(DRAFT_KEY);
          if (primera && !hasDraft && data.catalogo?.length > 5) {
            const defaults = data.catalogo.slice(0, 4).map(c => ({ apu_id: c.id, cantidad: 10 }));
            setItems(defaults);
          }
        } catch (_) {}
      })
      .catch(err => {
        console.error('Error cargando catálogo:', err);
        setLoadingCat(false);
      });
  }, [ubicacion]);

  // Persistir en localStorage en cada cambio
  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
        nombre: proyectoNombre,
        fechaInicio,
        numCuadrillas,
        items,
        updatedAt: Date.now(),
      }));
    } catch (_) {}
  }, [proyectoNombre, fechaInicio, numCuadrillas, items]);

  const handleCurrencyChange = (newCur) => {
    setCurrency(newCur);
    saveCurrency(newCur);
  };

  // Mapa rápido de catálogo
  const catalogoMap = useMemo(() => {
    const map = new Map();
    catalogo.forEach(c => map.set(c.id, c));
    return map;
  }, [catalogo]);

  // Cálculos reactivos
  const totals = useMemo(() => {
    return calcularPresupuesto(items, catalogoMap);
  }, [items, catalogoMap]);

  const capitulos = useMemo(() => {
    return agruparPorCapitulo(items, catalogoMap);
  }, [items, catalogoMap]);

  const cronograma = useMemo(() => {
    return calcularCronograma(items, catalogoMap, {
      fechaInicio,
      numCuadrillas,
      cuadrillas,
    });
  }, [items, catalogoMap, fechaInicio, numCuadrillas, cuadrillas]);

  // Modificación de ítems
  const handleAddItem = (apuId) => {
    setItems(prev => {
      const idx = prev.findIndex(it => it.apu_id === apuId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].cantidad = (Number(copy[idx].cantidad) || 0) + 1;
        return copy;
      }
      return [...prev, { apu_id: apuId, cantidad: 1 }];
    });
  };

  const handleUpdateQty = (apuId, deltaOrVal, isAbsolute = false) => {
    setItems(prev => {
      return prev.map(it => {
        if (it.apu_id !== apuId) return it;
        let newQty = isAbsolute ? Number(deltaOrVal) : (Number(it.cantidad) || 0) + deltaOrVal;
        return { ...it, cantidad: Math.max(0, isNaN(newQty) ? 0 : newQty) };
      }).filter(it => it.cantidad > 0);
    });
  };

  const handleRemoveItem = (apuId) => {
    setItems(prev => prev.filter(it => it.apu_id !== apuId));
  };

  const handleExportExcelDirect = async (tipo = 'completo') => {
    try {
      const res = await fetch('/api/cotizador/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          proyectoNombre,
          ubicacion,
          items,
          // Solo los APUs usados en el presupuesto (el servidor recalcula con el motor único)
          catalogoMap: Object.fromEntries(items.filter(it => catalogoMap.has(it.apu_id)).map(it => [it.apu_id, catalogoMap.get(it.apu_id)])),
          fechaInicio,
          duracionDias: cronograma.duracionDias,
          cronograma,
        }),
      });

      if (!res.ok) throw new Error('Error al exportar');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filePrefix = tipo === 'gratuito' ? 'Kalarti_Presupuesto_Resumen' : 'Kalarti_Presupuesto_Completo';
      a.download = `${filePrefix}_${proyectoNombre.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error(e);
      alert('Hubo un problema generando el archivo Excel.');
    }
  };

  return (
    <div className="cot-container">
      {/* Navegación superior compacta */}
      <nav className="cot-nav">
        <Link href="/" className="cot-brand">
          <img src="/icon.png" alt="Kalarti" style={{ width: 28, height: 28, borderRadius: 6 }} />
          <span>KALARTI</span>
          <span style={{ fontSize: 11, background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
            Cotizador
          </span>
        </Link>

        {/* Selector de Moneda */}
        <div className="cot-currency-toggle">
          <button
            className={`cot-currency-btn ${currency === 'COP' ? 'active' : ''}`}
            onClick={() => handleCurrencyChange('COP')}
          >
            COP ($)
          </button>
          <button
            className={`cot-currency-btn ${currency === 'USD' ? 'active' : ''}`}
            onClick={() => handleCurrencyChange('USD')}
          >
            USD ($)
          </button>
        </div>
      </nav>

      {/* Tabs Móvil / Desktop */}
      <div className="cot-tabs">
        <button
          className={`cot-tab ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          🧮 Ítems ({items.length})
        </button>
        <button
          className={`cot-tab ${activeTab === 'resumen' ? 'active' : ''}`}
          onClick={() => setActiveTab('resumen')}
        >
          📋 Resumen & AIU
        </button>
        <button
          className={`cot-tab ${activeTab === 'gantt' ? 'active' : ''}`}
          onClick={() => setActiveTab('gantt')}
        >
          📅 Cronograma ({cronograma.duracionDias}d)
        </button>
      </div>

      {/* Notificación temporal */}
      {notification && (
        <div style={{ background: '#10b981', color: '#0f172a', padding: '10px 16px', textAlign: 'center', fontWeight: 700, fontSize: 13 }}>
          {notification}
        </div>
      )}

      {/* Contenido principal según Tab */}
      <main className="cot-main">
        {/* Datos básicos del proyecto */}
        <div className="calc-card" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Nombre de tu Proyecto</label>
            <input
              type="text"
              value={proyectoNombre}
              onChange={e => setProyectoNombre(e.target.value)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: 16,
                fontWeight: 800,
                outline: 'none',
                borderBottom: '1px dashed rgba(255,255,255,0.2)',
                paddingBottom: 4,
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>📍 Ubicación del Proyecto</label>
            <select
              value={ubicacion}
              onChange={e => setUbicacion(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'white',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 13,
                outline: 'none',
              }}
            >
              {UBICACIONES_COTIZADOR.map(u => (
                <option key={u.id} value={u.nombre} style={{ background: '#0f172a', color: 'white' }}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Fecha de Inicio de Obra</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'white',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* TAB 1: ÍTEMS / CALCULADORA */}
        {activeTab === 'items' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>
                Agrega actividades para calcular costo y duración automáticamente:
              </div>
              <button
                onClick={() => setIsPickerOpen(true)}
                className="btn-action-primary"
                style={{ padding: '8px 14px', fontSize: 13 }}
              >
                + Agregar Ítem
              </button>
            </div>

            {loadingCat ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                Cargando base de datos de APUs Kalarti...
              </div>
            ) : items.length === 0 ? (
              <div className="calc-card" style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🏗️</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Tu presupuesto está vacío</h3>
                <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
                  Empieza agregando actividades de obra para ver precios y cronograma.
                </p>
                <button
                  onClick={() => setIsPickerOpen(true)}
                  className="btn-action-primary"
                >
                  + Seleccionar actividades de obra
                </button>
              </div>
            ) : (
              capitulos.map(cap => (
                <div key={cap.capitulo} style={{ marginBottom: 18 }}>
                  {/* Encabezado de Capítulo */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: 10,
                    marginBottom: 8,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24' }}>
                      📁 {cap.numero}. {cap.capitulo}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1' }}>
                      {formatMoney(cap.subtotal, currency)}
                    </span>
                  </div>

                  {/* Lista de Ítems */}
                  {cap.items.map(it => {
                    const apu = it.apu || {};
                    return (
                      <div key={it.apu_id} className="item-card">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: 10, background: 'rgba(255, 255, 255, 0.08)', padding: '2px 6px', borderRadius: 4, color: '#94a3b8' }}>
                              {it.numero}
                            </span>
                            <span style={{ fontSize: 10, color: apu.cuadrilla_color || '#3b82f6', fontWeight: 600 }}>
                              👷 {apu.cuadrilla_nombre || 'Cuadrilla'}
                            </span>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }} title={apu.descripcion || undefined}>
                            {apu.nombre}
                          </div>
                          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                            {formatMoney(apu.precio_unitario, currency)} / {apu.unidad}
                          </div>
                        </div>

                        {/* Controles de Cantidad Móvil */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                          <div className="qty-stepper">
                            <button
                              className="qty-btn"
                              onClick={() => handleUpdateQty(it.apu_id, -1)}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              className="qty-input"
                              value={it.cantidad}
                              inputMode="decimal"
                              onChange={e => handleUpdateQty(it.apu_id, e.target.value, true)}
                            />
                            <button
                              className="qty-btn"
                              onClick={() => handleUpdateQty(it.apu_id, 1)}
                            >
                              +
                            </button>
                          </div>

                          <div style={{ minWidth: 100, textAlign: 'right' }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>
                              {formatMoney(it.valor, currency)}
                            </div>
                            <button
                              onClick={() => handleRemoveItem(it.apu_id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer', marginTop: 2 }}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: RESUMEN Y AIU */}
        {activeTab === 'resumen' && (
          <div className="calc-card">
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>📋 Resumen Financiero de Obra</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: '#cbd5e1' }}>Costo Directo (Materiales, Equipos y Cuadrillas):</span>
                <span style={{ fontWeight: 800 }}>{formatMoney(totals.costoDirecto, currency)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#94a3b8' }}>
                <span>Administración ({AIU.admin}%):</span>
                <span>{formatMoney(totals.admin, currency)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#94a3b8' }}>
                <span>Imprevistos ({AIU.imprev}%):</span>
                <span>{formatMoney(totals.imprev, currency)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#94a3b8' }}>
                <span>Utilidad ({AIU.utilidad}%):</span>
                <span>{formatMoney(totals.utilidad, currency)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#94a3b8', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span>IVA sobre Utilidad ({AIU.ivaSobreUtilidad}%):</span>
                <span>{formatMoney(totals.iva, currency)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#10b981' }}>TOTAL PRESUPUESTADO</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Valores con AIU legal de construcción</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>
                  {formatMoney(totals.total, currency)}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24, padding: 14, background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#fbbf24', marginBottom: 4 }}>
                ℹ️ Nota Técnica Kalarti
              </div>
              <p style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                Este presupuesto integra precios de mercado actualizados en Colombia para obra civil, bioconstrucción y acabados. Los costos indirectos (AIU) corresponden a la normativa estándar para contratación y ejecución.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: GANTT */}
        {activeTab === 'gantt' && (
          <MiniGanttView
            cronograma={cronograma}
            numCuadrillas={numCuadrillas}
            setNumCuadrillas={setNumCuadrillas}
          />
        )}
      </main>

      {/* BARRA INFERIOR FIJA MÓVIL (TOTALIZADOR Y ACCIONES) */}
      <footer className="cot-bottom-bar">
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Total Estimado:</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981' }}>
            {formatMoney(totals.total, currency, { compact: false })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setIsSaveOpen(true)}
            className="btn-action-primary"
            style={{ padding: '10px 16px', fontSize: 13 }}
          >
            💾 Guardar
          </button>

          <button
            onClick={() => setIsPayOpen(true)}
            className="btn-action-secondary"
            style={{ padding: '10px 14px', fontSize: 13 }}
          >
            📊 Exportar / Planes
          </button>
        </div>
      </footer>

      {/* Modales */}
      <ItemPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        catalogo={catalogo}
        onAddItem={handleAddItem}
      />

      <SaveProjectModal
        isOpen={isSaveOpen}
        onClose={() => setIsSaveOpen(false)}
        proyectoData={{
          nombre: proyectoNombre,
          ubicacion: ubicacion,
          total: totals.total,
          items,
          duracionDias: cronograma.duracionDias,
        }}
        onSuccess={({ tipo, nombre }) => {
          setNotification(`¡Listo ${nombre}! Tu presupuesto ha sido guardado exitosamente.`);
          setTimeout(() => setNotification(null), 6000);
        }}
      />

      <PlansAndPayModal
        isOpen={isPayOpen}
        onClose={() => setIsPayOpen(false)}
        currency={currency}
        proyectoNombre={proyectoNombre}
        ubicacion={ubicacion}
        onExportExcel={handleExportExcelDirect}
      />
    </div>
  );
}
