'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';
import { CAPITULOS_APU } from '@/lib/catalogo-taxonomia';

const norm = (s) => String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

/**
 * Extrae metadatos (`aplica_a`, `activa`, `orden`) de un registro de `categorias`,
 * soportando tanto las columnas dedicadas de Fase 21 como el respaldo en `descripcion`.
 */
export function leerMetaCategoria(cat = {}) {
  const desc = String(cat.descripcion || '');
  const mAmb = desc.match(/AMBITO:(APU|INSUMO|AMBOS)/i);
  const mOrd = desc.match(/ORDEN:(\d+)/i);
  const mAct = desc.match(/ACTIVA:(true|false)/i);
  return {
    id: cat.id,
    nombre: String(cat.nombre || '').trim(),
    aplica_a: cat.aplica_a || (mAmb ? mAmb[1].toUpperCase() : 'AMBOS'),
    orden: cat.orden !== undefined && cat.orden !== null ? Number(cat.orden) : (mOrd ? Number(mOrd[1]) : 100),
    activa: cat.activa !== undefined && cat.activa !== null ? Boolean(cat.activa) : (mAct ? mAct[1] !== 'false' : true),
  };
}

export function serializarMetaCategoria({ aplica_a = 'AMBOS', orden = 100, activa = true }) {
  return `AMBITO:${aplica_a}|ORDEN:${Number(orden) || 0}|ACTIVA:${activa !== false}`;
}

/**
 * Devuelve la lista de categorías activas para un ámbito ('APU' | 'INSUMO' | 'AMBOS'),
 * garantizando que CARPINTERÍA METÁLICA y VENTANERÍA Y VIDRIOS estén siempre disponibles.
 */
export function categoriasActivasPara(state, ambito = 'APU') {
  const porClave = new Map();
  const inactivas = new Set();

  (state?.categorias || []).forEach((raw) => {
    const c = leerMetaCategoria(raw);
    if (!c.nombre) return;
    const k = norm(c.nombre);
    if (!c.activa) {
      inactivas.add(k);
      return;
    }
    const existente = porClave.get(k);
    // Preferir el nombre con tildes
    if (!existente || (c.nombre !== k && existente.nombre === k)) {
      porClave.set(k, c);
    }
  });

  if (ambito === 'APU') {
    const baseApu = [
      ...CAPITULOS_APU.map((c, idx) => ({ nombre: c.nombre, aplica_a: 'APU', orden: (idx + 1) * 10, activa: true })),
      { nombre: 'CARPINTERÍA METÁLICA', aplica_a: 'AMBOS', orden: 175, activa: true },
      { nombre: 'VENTANERÍA Y VIDRIOS', aplica_a: 'AMBOS', orden: 176, activa: true },
    ];
    baseApu.forEach((b) => {
      const k = norm(b.nombre);
      if (!inactivas.has(k) && !porClave.has(k)) porClave.set(k, b);
    });
    (state?.apus || []).forEach((a) => {
      if (!a.categoria_apu) return;
      const k = norm(a.categoria_apu);
      if (!inactivas.has(k) && !porClave.has(k)) {
        porClave.set(k, { nombre: a.categoria_apu, aplica_a: 'APU', orden: 250, activa: true });
      }
    });
  } else if (ambito === 'INSUMO') {
    const baseIns = [
      { nombre: 'CARPINTERÍA METÁLICA', aplica_a: 'AMBOS', orden: 175, activa: true },
      { nombre: 'VENTANERÍA Y VIDRIOS', aplica_a: 'AMBOS', orden: 176, activa: true },
    ];
    baseIns.forEach((b) => {
      const k = norm(b.nombre);
      if (!inactivas.has(k) && !porClave.has(k)) porClave.set(k, b);
    });
    (state?.insumos || []).forEach((i) => {
      if (!i.categoria) return;
      const k = norm(i.categoria);
      if (!inactivas.has(k) && !porClave.has(k)) {
        porClave.set(k, { nombre: i.categoria, aplica_a: 'INSUMO', orden: 350, activa: true });
      }
    });
  }

  return Array.from(porClave.values())
    .filter((c) => c.activa && (ambito === 'AMBOS' || c.aplica_a === 'AMBOS' || c.aplica_a === ambito))
    .sort((a, b) => (a.orden - b.orden) || a.nombre.localeCompare(b.nombre, 'es'));
}

export default function CategoriasModal({ isOpen, onClose, ambitoInicial = 'APU' }) {
  const { state, dispatch } = useStore();
  const [filtroAmbito, setFiltroAmbito] = useState(ambitoInicial);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoAmbito, setNuevoAmbito] = useState(ambitoInicial === 'INSUMO' ? 'INSUMO' : 'APU');
  const [nuevoOrden, setNuevoOrden] = useState('100');
  const [editRow, setEditRow] = useState(null); // { id, nombreOriginal, nombre, aplica_a, orden }
  const [bajaRow, setBajaRow] = useState(null); // { cat, apusCount, insumosCount, destino }

  const filas = useMemo(() => {
    const map = new Map();
    (state.categorias || []).forEach((raw) => {
      const m = leerMetaCategoria(raw);
      if (!m.nombre) return;
      const k = norm(m.nombre);
      // Si hay duplicados en BD (con/sin tilde), conservar el que tiene tilde o el más reciente
      if (!map.has(k) || (m.nombre !== k && map.get(k).nombre === k)) {
        map.set(k, m);
      }
    });
    return Array.from(map.values())
      .filter((c) => c.activa)
      .filter((c) => filtroAmbito === 'TODOS' || c.aplica_a === 'AMBOS' || c.aplica_a === filtroAmbito)
      .map((c) => {
        const k = norm(c.nombre);
        const apusCount = (state.apus || []).filter((a) => norm(a.categoria_apu) === k).length;
        const insumosCount = (state.insumos || []).filter((i) => i.categoria_id === c.id || norm(i.categoria) === k).length;
        return { ...c, apusCount, insumosCount, totalUso: apusCount + insumosCount };
      })
      .sort((a, b) => (a.orden - b.orden) || a.nombre.localeCompare(b.nombre, 'es'));
  }, [state.categorias, state.apus, state.insumos, filtroAmbito]);

  if (!isOpen) return null;

  const handleCrear = (e) => {
    e.preventDefault();
    const nombre = nuevoNombre.trim().toUpperCase();
    if (!nombre) return alert('Ingresa el nombre de la categoría.');
    const yaExiste = filas.some((f) => norm(f.nombre) === norm(nombre));
    if (yaExiste) return alert('Ya existe una categoría activa con ese nombre.');
    const orden = Number(nuevoOrden) || 100;
    dispatch({
      type: 'ADD_CATEGORIA',
      payload: {
        id: crypto.randomUUID(),
        nombre,
        aplica_a: nuevoAmbito,
        orden,
        activa: true,
        descripcion: serializarMetaCategoria({ aplica_a: nuevoAmbito, orden, activa: true }),
      },
    });
    setNuevoNombre('');
  };

  const handleGuardarEdicion = () => {
    if (!editRow) return;
    const nombre = editRow.nombre.trim().toUpperCase();
    if (!nombre) return alert('El nombre no puede estar vacío.');
    const orden = Number(editRow.orden) || 100;
    dispatch({
      type: 'UPDATE_CATEGORIA',
      payload: {
        id: editRow.id,
        nombre,
        oldNombre: editRow.nombreOriginal,
        aplica_a: editRow.aplica_a,
        orden,
        activa: true,
        descripcion: serializarMetaCategoria({ aplica_a: editRow.aplica_a, orden, activa: true }),
      },
    });
    setEditRow(null);
  };

  const iniciarBaja = (cat) => {
    if (cat.totalUso > 0) {
      const candidatas = filas.filter((f) => f.id !== cat.id);
      setBajaRow({
        cat,
        apusCount: cat.apusCount,
        insumosCount: cat.insumosCount,
        destinoId: candidatas[0]?.id || '',
      });
    } else {
      if (!confirm(`¿Desactivar la categoría "${cat.nombre}"?`)) return;
      dispatch({
        type: 'DEACTIVATE_CATEGORIA',
        payload: { id: cat.id, nombre: cat.nombre, aplica_a: cat.aplica_a, orden: cat.orden },
      });
    }
  };

  const confirmarBajaConReasignacion = () => {
    if (!bajaRow) return;
    const destino = filas.find((f) => f.id === bajaRow.destinoId);
    if (!destino) return alert('Selecciona la categoría destino para reasignar los ítems.');
    dispatch({
      type: 'DEACTIVATE_CATEGORIA',
      payload: {
        id: bajaRow.cat.id,
        nombre: bajaRow.cat.nombre,
        aplica_a: bajaRow.cat.aplica_a,
        orden: bajaRow.cat.orden,
        reasignarA: { id: destino.id, nombre: destino.nombre },
      },
    });
    setBajaRow(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 740, width: '95%' }}>
        <div className="modal-header">
          <h2>⚙️ Gestionar Categorías (APU e Insumos)</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Formulario de creación */}
          <form onSubmit={handleCrear} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 90px auto', gap: 8, alignItems: 'end', background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>Nueva categoría</label>
              <input className="form-input" placeholder="Ej: CARPINTERÍA METÁLICA" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>Ámbito</label>
              <select className="form-select" value={nuevoAmbito} onChange={(e) => setNuevoAmbito(e.target.value)}>
                <option value="APU">Solo APU</option>
                <option value="INSUMO">Solo Insumos</option>
                <option value="AMBOS">Ambos</option>
              </select>
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>Orden</label>
              <input type="number" className="form-input" value={nuevoOrden} onChange={(e) => setNuevoOrden(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary">+ Crear</button>
          </form>

          {/* Alerta de reasignación antes de dar de baja */}
          {bajaRow && (
            <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                ⚠️ La categoría &ldquo;{bajaRow.cat.nombre}&rdquo; tiene {bajaRow.apusCount} APU(s) y {bajaRow.insumosCount} insumo(s) asignados.
              </div>
              <div style={{ fontSize: 12, color: '#78350f' }}>
                Selecciona a qué categoría deseas reasignarlos antes de desactivarla:
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select className="form-select" style={{ flex: 1 }} value={bajaRow.destinoId} onChange={(e) => setBajaRow({ ...bajaRow, destinoId: e.target.value })}>
                  {filas.filter((f) => f.id !== bajaRow.cat.id).map((f) => (
                    <option key={f.id} value={f.id}>{f.nombre} ({f.aplica_a})</option>
                  ))}
                </select>
                <button className="btn btn-primary btn-sm" onClick={confirmarBajaConReasignacion}>Reasignar y desactivar</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setBajaRow(null)}>Cancelar</button>
              </div>
            </div>
          )}

          {/* Filtro de ámbito */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['TODOS', 'APU', 'INSUMO'].map((amb) => (
                <button
                  key={amb}
                  type="button"
                  className={`btn btn-sm ${filtroAmbito === amb ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFiltroAmbito(amb)}
                >
                  {amb === 'TODOS' ? 'Todas' : amb === 'APU' ? 'Capítulos APU' : 'Categorías Insumos'}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 12, color: '#64748b' }}>{filas.length} categorías activas</span>
          </div>

          {/* Tabla de categorías */}
          <div className="table-container" style={{ maxHeight: 340, overflowY: 'auto' }}>
            <table className="data-table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th style={{ width: 120 }}>Ámbito</th>
                  <th style={{ width: 70, textAlign: 'right' }}>Orden</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Ítems asignados</th>
                  <th style={{ width: 140, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((c) => {
                  const enEdicion = editRow?.id === c.id;
                  return (
                    <tr key={c.id || c.nombre}>
                      <td>
                        {enEdicion ? (
                          <input className="form-input" style={{ fontSize: 12, padding: '2px 6px' }} value={editRow.nombre} onChange={(e) => setEditRow({ ...editRow, nombre: e.target.value })} />
                        ) : (
                          <strong>{c.nombre}</strong>
                        )}
                      </td>
                      <td>
                        {enEdicion ? (
                          <select className="form-select" style={{ fontSize: 11, padding: '2px 6px' }} value={editRow.aplica_a} onChange={(e) => setEditRow({ ...editRow, aplica_a: e.target.value })}>
                            <option value="APU">APU</option>
                            <option value="INSUMO">INSUMO</option>
                            <option value="AMBOS">AMBOS</option>
                          </select>
                        ) : (
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#f1f5f9', fontWeight: 600 }}>{c.aplica_a}</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {enEdicion ? (
                          <input type="number" className="form-input" style={{ width: 64, fontSize: 12, padding: '2px 6px', textAlign: 'right' }} value={editRow.orden} onChange={(e) => setEditRow({ ...editRow, orden: e.target.value })} />
                        ) : c.orden}
                      </td>
                      <td style={{ textAlign: 'right', color: '#475569' }}>
                        {c.apusCount > 0 && <span>{c.apusCount} APU </span>}
                        {c.insumosCount > 0 && <span>{c.insumosCount} Ins.</span>}
                        {c.totalUso === 0 && <span style={{ color: '#94a3b8' }}>0</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {enEdicion ? (
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary btn-sm" onClick={handleGuardarEdicion}>Guardar</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditRow(null)}>✕</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Editar / renombrar en cascada"
                              onClick={() => setEditRow({ id: c.id, nombreOriginal: c.nombre, nombre: c.nombre, aplica_a: c.aplica_a, orden: c.orden })}
                            >
                              ✏️
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Desactivar categoría"
                              onClick={() => iniciarBaja(c)}
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
