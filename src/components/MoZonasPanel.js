'use client';

/**
 * Mano de obra por zona: factor general por municipio con excepciones por cargo.
 * Se guarda en global_config.MO_ZONAS:
 *   { "ricaurte": { "factor_general": 1.10, "cargos": { "MO-OFI": 1.15 } } }
 * El motor de costos (apu-engine) lo aplica a los cargos de mano de obra cuando se costea en esa ubicación.
 */
import { useMemo, useState } from 'react';
import { useStore } from '@/store/StoreContext';
import { UBICACIONES_COTIZADOR } from '@/lib/cotizador/config';
import { normZona, leerMoZonas, ZONA_MATRIZ } from '@/lib/apu-engine';

const ZONAS = UBICACIONES_COTIZADOR.filter((u) => u.id !== 'otra' && normZona(u.nombre) !== ZONA_MATRIZ);

function aTexto(map) {
  const obj = {};
  map.forEach((v, k) => { obj[k] = { factor_general: v.general, ...(Object.keys(v.cargos || {}).length ? { cargos: v.cargos } : {}) }; });
  return obj;
}

export default function MoZonasPanel() {
  const { state, dispatch } = useStore();
  const raw = state.config?.find((c) => c.clave === 'MO_ZONAS')?.valor;
  const guardado = useMemo(() => leerMoZonas(raw), [raw]);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const datos = draft || guardado;

  const cargosMO = useMemo(
    () => (state.cargos || []).filter((c) => String(c.codigo || '').startsWith('MO-')).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es')),
    [state.cargos]
  );

  const get = (z) => datos.get(z) || { general: 1, cargos: {} };
  const set = (z, parcial) => {
    const next = new Map(datos);
    next.set(z, { ...get(z), ...parcial });
    setDraft(next);
  };
  const setCargo = (z, codigo, valor) => {
    const cargos = { ...get(z).cargos };
    const n = Number(valor);
    if (!n || n === 1) delete cargos[codigo]; else cargos[codigo] = n;
    set(z, { cargos });
  };

  const guardar = async () => {
    setSaving(true);
    try {
      await dispatch({ type: 'UPDATE_CONFIG', payload: { clave: 'MO_ZONAS', valor: JSON.stringify(aTexto(datos)) } });
      setDraft(null);
    } catch (e) {
      alert('No se pudo guardar: ' + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const input = { width: 72, padding: '2px 6px', textAlign: 'right', fontSize: 12 };

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3>Mano de obra por zona</h3>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            Pasto es la base (1,00). Cada municipio aplica un factor general y, si hace falta, excepciones por cargo. Se refleja en cotizador, presupuestos y Gestión APU.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" disabled={!draft || saving} onClick={guardar}>
          {saving ? 'Guardando…' : 'Guardar factores'}
        </button>
      </div>
      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th>Zona</th>
              <th style={{ textAlign: 'right' }}>Factor general</th>
              {cargosMO.map((c) => <th key={c.id} style={{ textAlign: 'right', fontSize: 11 }} title={c.codigo}>{c.nombre}</th>)}
            </tr>
          </thead>
          <tbody>
            {ZONAS.map((u) => {
              const z = normZona(u.nombre);
              const v = get(z);
              return (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.nombre}</td>
                  <td style={{ textAlign: 'right' }}>
                    <input type="number" step="0.01" min="0.5" max="3" className="form-input" style={input} value={v.general} onChange={(e) => set(z, { general: Number(e.target.value) || 1 })} />
                  </td>
                  {cargosMO.map((c) => (
                    <td key={c.id} style={{ textAlign: 'right' }}>
                      <input
                        type="number" step="0.01" min="0.5" max="3" className="form-input" style={input}
                        placeholder="—" value={v.cargos?.[c.codigo] ?? ''}
                        onChange={(e) => setCargo(z, c.codigo, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11, color: '#94a3b8', padding: '8px 16px' }}>
        La excepción por cargo reemplaza al factor general para ese cargo; las cuadrillas se ajustan por sus integrantes.
      </p>
    </div>
  );
}
