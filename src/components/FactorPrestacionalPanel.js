'use client';

/**
 * Panel "Factor prestacional" (ERP › Mano de obra).
 * Edita SMLV, subsidio de transporte y los componentes prestacionales por nivel salarial.
 * Guarda en global_config (SMLV, FACTOR_PRESTACIONAL) y actualiza factor_multiplicador de los cargos MO-*.
 * factor = 1 + Σ pct (redondeado a 2 decimales), sobre salario anual base.
 */
import { useMemo, useState } from 'react';
import { useStore } from '@/store/StoreContext';
import { SMLV_2026 } from '@/lib/apu-engine';

const SUBSIDIO_DEFAULT = 200000;

const comps = (transporte, dotacion) => [
  { concepto: 'Cesantía anual', pct: [0.0833, 0.0833, 0.0833] },
  { concepto: 'Intereses sobre cesantía', pct: [0.01, 0.01, 0.01] },
  { concepto: 'Prima de servicios', pct: [0.0833, 0.0833, 0.0833] },
  { concepto: 'Vacaciones', pct: [0.0417, 0.0417, 0.0417] },
  { concepto: 'Salud (EPS)', pct: [0.085, 0.085, 0.085] },
  { concepto: 'Pensión', pct: [0.12, 0.12, 0.12] },
  { concepto: 'ARL (riesgo V)', pct: [0.0696, 0.0696, 0.0696] },
  { concepto: 'Caja de compensación', pct: [0.04, 0.04, 0.04] },
  { concepto: 'ICBF', pct: [0.03, 0.03, 0.03] },
  { concepto: 'SENA', pct: [0.02, 0.02, 0.02] },
  { concepto: 'Subsidio de transporte', pct: transporte },
  { concepto: 'Dotación y EPP', pct: dotacion },
];

export const FACTOR_PRESTACIONAL_DEFAULT = {
  smlv: SMLV_2026,
  subsidio_transporte: SUBSIDIO_DEFAULT,
  obreros: {
    niveles: [1, 1.5, 2],
    componentes: comps([0.1142, 0.0762, 0.0571], [0.0729, 0.0509, 0.04]),
    factor: [1.77, 1.71, 1.68],
  },
  empleados: {
    niveles: [2.5, 3, 4],
    componentes: comps([0, 0, 0], [0.0071, 0.0071, 0.0071]),
    factor: [1.59, 1.59, 1.59],
  },
};

const GRUPOS = [
  { key: 'obreros', titulo: 'Obreros' },
  { key: 'empleados', titulo: 'Empleados' },
];

const round2 = (v) => Math.round(v * 100) / 100;
const esTransporte = (concepto) => /transporte/i.test(concepto || '');
const clone = (o) => JSON.parse(JSON.stringify(o));

/** Normaliza el JSON guardado, completando con valores por defecto */
function normalizar(raw, smlvCfg) {
  let obj = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { obj = null; }
  }
  const base = clone(FACTOR_PRESTACIONAL_DEFAULT);
  if (!obj || typeof obj !== 'object') {
    if (smlvCfg) base.smlv = smlvCfg;
    return base;
  }
  const out = {
    smlv: Number(obj.smlv) || smlvCfg || base.smlv,
    subsidio_transporte: Number(obj.subsidio_transporte ?? base.subsidio_transporte) || 0,
  };
  GRUPOS.forEach(({ key }) => {
    const g = obj[key] || {};
    const niveles = Array.isArray(g.niveles) && g.niveles.length ? g.niveles.map(Number) : base[key].niveles;
    const componentes = Array.isArray(g.componentes) && g.componentes.length
      ? g.componentes.map((c) => ({ concepto: String(c.concepto || ''), pct: niveles.map((_, i) => Number(c.pct?.[i]) || 0) }))
      : base[key].componentes;
    out[key] = { niveles, componentes, factor: Array.isArray(g.factor) ? g.factor.map(Number) : base[key].factor };
  });
  return out;
}

/** Recalcula pct de transporte (subsidio / salario del nivel) y factores */
function recalcular(fp) {
  const out = clone(fp);
  GRUPOS.forEach(({ key }) => {
    const g = out[key];
    g.componentes.forEach((c) => {
      if (esTransporte(c.concepto) && c.pct.some((v) => v > 0)) {
        c.pct = g.niveles.map((n) => (out.smlv > 0 && n > 0 ? Math.round((out.subsidio_transporte / (out.smlv * n)) * 10000) / 10000 : 0));
      }
    });
    g.factor = g.niveles.map((_, i) => round2(1 + g.componentes.reduce((s, c) => s + (Number(c.pct[i]) || 0), 0)));
  });
  return out;
}

/** Factor del nivel correspondiente a n.º de SMLV (coincidencia exacta o nivel más cercano) */
function factorParaNivel(fp, nSmlv) {
  const n = Number(nSmlv) || 1;
  for (const { key } of GRUPOS) {
    const idx = fp[key].niveles.findIndex((x) => Math.abs(x - n) < 1e-6);
    if (idx >= 0) return { factor: fp[key].factor[idx], grupo: key, nivel: fp[key].niveles[idx] };
  }
  const key = n <= 2 ? 'obreros' : 'empleados';
  const niveles = fp[key].niveles;
  let best = 0;
  niveles.forEach((x, i) => { if (Math.abs(x - n) < Math.abs(niveles[best] - n)) best = i; });
  return { factor: fp[key].factor[best], grupo: key, nivel: niveles[best], aproximado: true };
}

const money = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v) || 0);

export default function FactorPrestacionalPanel() {
  const { state, dispatch, calcularDatosCargo } = useStore();
  const cfg = (k) => state.config?.find((c) => c.clave === k)?.valor;
  const smlvCfg = parseFloat(cfg('SMLV')) || 0;
  const horasDia = parseFloat(cfg('HORAS_DIA')) || 8;
  const rawFP = cfg('FACTOR_PRESTACIONAL');

  const guardado = useMemo(() => recalcular(normalizar(rawFP, smlvCfg)), [rawFP, smlvCfg]);
  const [draft, setDraft] = useState(null); // null = sin cambios
  const fp = draft || guardado;
  const [saving, setSaving] = useState(false);

  const actualizar = (fn) => {
    const next = clone(fp);
    fn(next);
    setDraft(recalcular(next));
  };

  // Cargos MO-* (integrantes) y cuadrillas
  const integrantesPorPadre = useMemo(() => {
    const m = new Map();
    (state.cargoDetalles || []).forEach((d) => {
      if (!m.has(d.cargo_padre_id)) m.set(d.cargo_padre_id, []);
      m.get(d.cargo_padre_id).push(d);
    });
    return m;
  }, [state.cargoDetalles]);

  const cargosMO = useMemo(() => {
    const porCodigo = state.cargos.filter((c) => String(c.codigo || '').toUpperCase().startsWith('MO-'));
    if (porCodigo.length) return porCodigo;
    const hijos = new Set((state.cargoDetalles || []).map((d) => d.cargo_hijo_id));
    return state.cargos.filter((c) => hijos.has(c.id) && !integrantesPorPadre.has(c.id));
  }, [state.cargos, state.cargoDetalles, integrantesPorPadre]);

  const cuadrillas = useMemo(
    () => state.cargos.filter((c) => String(c.codigo || '').toUpperCase().startsWith('CUA-') || integrantesPorPadre.has(c.id)),
    [state.cargos, integrantesPorPadre]
  );

  const filasSalario = cargosMO
    .map((c) => {
      const n = Number(c.factor_smlv) || 1;
      const nivel = factorParaNivel(fp, n);
      const mensual = fp.smlv * n * nivel.factor;
      const jornal = mensual / 30;
      return { c, n, nivel, actual: Number(c.factor_multiplicador) || 1, mensual, jornal, hh: jornal / horasDia };
    })
    .sort((a, b) => a.n - b.n || String(a.c.nombre).localeCompare(String(b.c.nombre), 'es'));

  const cambiosCargos = filasSalario.filter((f) => Math.abs(f.actual - f.nivel.factor) > 0.0001);
  const hayCambios = !!draft || cambiosCargos.length > 0;

  const handleGuardar = async () => {
    if (!window.confirm(`Se guardará la configuración y se actualizará el factor de ${cambiosCargos.length} cargo(s). ¿Continuar?`)) return;
    setSaving(true);
    try {
      const payload = recalcular(fp);
      await dispatch({ type: 'UPDATE_CONFIG', payload: { clave: 'SMLV', valor: String(payload.smlv) } });
      await dispatch({ type: 'UPDATE_CONFIG', payload: { clave: 'FACTOR_PRESTACIONAL', valor: JSON.stringify(payload) } });
      for (const f of cambiosCargos) {
        await dispatch({ type: 'UPDATE_CARGO', payload: { id: f.c.id, factor_multiplicador: f.nivel.factor } });
      }
      setDraft(null);
    } catch (e) {
      console.error(e);
      alert('No se pudo guardar el factor prestacional: ' + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const th = { fontSize: 11, textAlign: 'right' };
  const inputPct = { width: 72, padding: '2px 6px', textAlign: 'right', fontSize: 12 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* Parámetros */}
      <div className="card" style={{ padding: 'var(--space-md)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-lg)', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>SMLV</div>
          <input type="number" className="form-input" style={{ width: 160, fontWeight: 700 }} value={fp.smlv}
            onChange={(e) => actualizar((n) => { n.smlv = Number(e.target.value) || 0; })} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Subsidio de transporte</div>
          <input type="number" className="form-input" style={{ width: 160, fontWeight: 700 }} value={fp.subsidio_transporte}
            onChange={(e) => actualizar((n) => { n.subsidio_transporte = Number(e.target.value) || 0; })} />
        </div>
        <div style={{ flex: 1, fontSize: 11, color: '#64748b', minWidth: 220 }}>
          Factor = 1 + Σ componentes (base salario anual). El subsidio de transporte se recalcula por nivel.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {draft && (
            <button className="btn btn-secondary" onClick={() => setDraft(null)} disabled={saving}>Descartar</button>
          )}
          <button className="btn btn-primary" onClick={handleGuardar} disabled={!hayCambios || saving}>
            {saving ? 'Guardando…' : 'Guardar y aplicar'}
          </button>
        </div>
      </div>

      {/* Componentes por nivel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 'var(--space-md)' }}>
        {GRUPOS.map(({ key, titulo }) => {
          const g = fp[key];
          return (
            <div className="card" key={key}>
              <div style={{ padding: '10px 14px', fontWeight: 700 }}>{titulo}</div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      {g.niveles.map((n, i) => (
                        <th key={i} style={th}>{n} SMLV</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.componentes.map((c, ci) => (
                      <tr key={ci}>
                        <td style={{ fontSize: 12 }}>{c.concepto}</td>
                        {g.niveles.map((_, i) => (
                          <td key={i} style={{ textAlign: 'right' }}>
                            {esTransporte(c.concepto) && c.pct.some((v) => v > 0) ? (
                              <span style={{ fontSize: 12, color: '#64748b' }}>{(c.pct[i] * 100).toFixed(2)}%</span>
                            ) : (
                              <input
                                type="number"
                                step="0.01"
                                className="form-input"
                                style={inputPct}
                                value={Math.round((Number(c.pct[i]) || 0) * 10000) / 100}
                                onChange={(e) => actualizar((n) => { n[key].componentes[ci].pct[i] = (Number(e.target.value) || 0) / 100; })}
                              />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 800, background: 'var(--color-bg-alt)' }}>
                      <td>Factor prestacional</td>
                      {g.factor.map((f, i) => (
                        <td key={i} style={{ textAlign: 'right' }}>{f.toFixed(2)}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabla de salarios */}
      <div className="card">
        <div style={{ padding: '10px 14px', fontWeight: 700 }}>Tabla de salarios (mano de obra)</div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cargo</th>
                <th style={th}>N.º SMLV</th>
                <th style={th}>Factor</th>
                <th style={th}>Mensual integral</th>
                <th style={th}>Jornal</th>
                <th style={th}>Valor H-H</th>
              </tr>
            </thead>
            <tbody>
              {filasSalario.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8' }}>Sin cargos de mano de obra.</td></tr>
              )}
              {filasSalario.map((f) => (
                <tr key={f.c.id}>
                  <td>{f.c.nombre}</td>
                  <td style={{ textAlign: 'right' }}>{f.n}</td>
                  <td style={{ textAlign: 'right' }}>
                    {f.nivel.factor.toFixed(2)}
                    {Math.abs(f.actual - f.nivel.factor) > 0.0001 && (
                      <span style={{ fontSize: 10, color: '#d97706', marginLeft: 6 }} title="Factor actual del cargo">
                        (actual {f.actual.toFixed(2)})
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>{money(f.mensual)}</td>
                  <td style={{ textAlign: 'right' }}>{money(f.jornal)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(f.hh)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cuadrillas */}
      <div className="card">
        <div style={{ padding: '10px 14px', fontWeight: 700 }}>
          Cuadrillas <span style={{ fontWeight: 400, fontSize: 11, color: '#64748b' }}>(valor hora con la configuración guardada)</span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cuadrilla</th>
                <th>Integrantes</th>
                <th style={th}>Valor hora</th>
              </tr>
            </thead>
            <tbody>
              {cuadrillas.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8' }}>Sin cuadrillas.</td></tr>
              )}
              {cuadrillas.map((cq) => {
                const ints = integrantesPorPadre.get(cq.id) || [];
                return (
                  <tr key={cq.id}>
                    <td>{cq.nombre}</td>
                    <td style={{ fontSize: 12, color: '#475569' }}>
                      {ints.map((d) => `${Number(d.cantidad) || 0} × ${state.cargos.find((c) => c.id === d.cargo_hijo_id)?.nombre || '—'}`).join(' · ') || '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(calcularDatosCargo(cq.id).precioHora)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
