'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/planes';

export default function RedTalentoModal({
  isOpen,
  onClose,
  proyecto,
  initialCargoId = '',
  initialCuadrillaIdx = 0,
  equipoPadreId = null,
  cargos = [],
  allPersonal = [],
  onVincularProfesional,
  initialTab = 'talento',
}) {
  const [tab, setTab] = useState(initialTab);
  const [filtroCargoId, setFiltroCargoId] = useState(initialCargoId || '');
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [soloVerificados, setSoloVerificados] = useState(false);

  const [redTalento, setRedTalento] = useState([]);
  const [cuadrillasOfertadas, setCuadrillasOfertadas] = useState([]);
  const [convocatorias, setConvocatorias] = useState([]);
  const [postulaciones, setPostulaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // Formulario para publicar convocatoria
  const [convForm, setConvForm] = useState({
    titulo: '',
    cargo_id: initialCargoId || '',
    municipio: proyecto?.ubicacion || 'Pasto',
    tipo_contrato: 'Obra o Labor',
    salario_rango: '',
    vacantes: 1,
    descripcion: '',
  });

  // Formulario para ofertar cuadrilla con capacidad ociosa
  const [cuadForm, setCuadForm] = useState({
    titulo: '',
    cargo_id: initialCargoId || '',
    municipio: proyecto?.ubicacion || 'Pasto',
    integrantes: 3,
    disponible_desde: '',
    disponible_hasta: '',
    tarifa_referencia: '',
    unidad_tarifa: 'Día',
    contacto_nombre: '',
    contacto_whatsapp: '',
    descripcion: '',
  });

  useEffect(() => {
    setFiltroCargoId(initialCargoId || '');
    const cargoObj = cargos.find((c) => c.id === initialCargoId);
    const mun = (proyecto?.ubicacion || 'Pasto').split(',')[0].trim();
    setConvForm((prev) => ({
      ...prev,
      cargo_id: initialCargoId || prev.cargo_id,
      municipio: mun || 'Pasto',
      titulo: cargoObj ? `Se requiere ${cargoObj.nombre} para ${proyecto?.nombre || 'Obra'}` : prev.titulo,
    }));
    setCuadForm((prev) => ({
      ...prev,
      cargo_id: initialCargoId || prev.cargo_id,
      municipio: mun || 'Pasto',
      titulo: cargoObj ? `Cuadrilla disponible: ${cargoObj.nombre}` : prev.titulo,
    }));
  }, [initialCargoId, proyecto, cargos]);

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  const cargarDatosRed = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [resTalento, resCuad, resConv, resPost] = await Promise.all([
        supabase.from('personal').select('*'),
        supabase.from('cuadrillas_ofertadas').select('*').eq('activa', true).order('created_at', { ascending: false }),
        supabase
          .from('convocatorias_ofertas')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('postulaciones_profesionales')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      if (!resTalento.error && resTalento.data) {
        setRedTalento(resTalento.data);
      } else {
        setRedTalento(allPersonal);
      }
      if (!resCuad.error && resCuad.data) setCuadrillasOfertadas(resCuad.data);
      if (!resConv.error && resConv.data) setConvocatorias(resConv.data);
      if (!resPost.error && resPost.data) setPostulaciones(resPost.data);
    } catch (e) {
      console.warn('Carga Red de Talento:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarDatosRed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const candidatosFiltrados = useMemo(() => {
    const source = redTalento.length > 0 ? redTalento : allPersonal;
    const q = busqueda.trim().toLowerCase();
    const munQ = filtroMunicipio.trim().toLowerCase();
    const cargoTarget = cargos.find((c) => c.id === filtroCargoId);
    const cargoTargetNorm = (cargoTarget?.nombre || '').toLowerCase();

    return source.filter((p) => {
      if ((p.profesion || '').toLowerCase() === 'cliente') return false;
      if (soloVerificados && p.estado_verificacion !== 'VERIFICADO') return false;

      if (filtroCargoId) {
        const pCargos = Array.isArray(p.cargos_ids)
          ? p.cargos_ids
          : p.cargo_id
          ? [p.cargo_id]
          : [];
        const profNorm = (p.profesion || '').toLowerCase();
        const matchCargo =
          pCargos.includes(filtroCargoId) ||
          (cargoTargetNorm && profNorm && (profNorm.includes(cargoTargetNorm) || cargoTargetNorm.includes(profNorm)));
        if (!matchCargo) return false;
      }

      if (munQ) {
        const muns = [
          p.ciudad || '',
          ...(Array.isArray(p.municipios_cobertura) ? p.municipios_cobertura : []),
        ]
          .join(' ')
          .toLowerCase();
        if (!muns.includes(munQ)) return false;
      }

      if (q) {
        const full = `${p.nombres || ''} ${p.apellidos || ''} ${p.nombre || ''} ${p.profesion || ''} ${p.email || ''}`.toLowerCase();
        if (!full.includes(q)) return false;
      }

      return true;
    });
  }, [redTalento, allPersonal, busqueda, filtroMunicipio, filtroCargoId, soloVerificados, cargos]);

  const handlePublicarConvocatoria = async (e) => {
    e.preventDefault();
    if (!supabase || !convForm.titulo.trim()) return;
    setLoading(true);
    setMsg('');
    try {
      const { data, error } = await supabase
        .from('convocatorias_ofertas')
        .insert({
          proyecto_id: proyecto?.id || null,
          cargo_id: convForm.cargo_id || null,
          titulo: convForm.titulo.trim(),
          municipio: convForm.municipio.trim() || 'Pasto',
          tipo_contrato: convForm.tipo_contrato,
          salario_rango: convForm.salario_rango.trim() || null,
          vacantes: Number(convForm.vacantes) || 1,
          descripcion: convForm.descripcion.trim() || null,
          activa: true,
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      setConvocatorias([data, ...convocatorias]);
      setMsg('✅ Convocatoria publicada en la Red de Talento y visible en /unete y /mi-portal.');
    } catch (err) {
      setMsg('⚠️ Error al publicar convocatoria (verifica haber ejecutado migration-fase22-ecosistema-talento.sql): ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handlePublicarCuadrillaOciosa = async (e) => {
    e.preventDefault();
    if (!supabase || !cuadForm.titulo.trim()) return;
    setLoading(true);
    setMsg('');
    try {
      const cargoNombre = cargos.find((c) => c.id === cuadForm.cargo_id)?.nombre || '';
      const { data, error } = await supabase
        .from('cuadrillas_ofertadas')
        .insert({
          cargo_id: cuadForm.cargo_id || null,
          titulo: cuadForm.titulo.trim(),
          especialidad: cargoNombre,
          municipio: cuadForm.municipio.trim() || 'Pasto',
          integrantes: Number(cuadForm.integrantes) || 2,
          disponible_desde: cuadForm.disponible_desde || null,
          disponible_hasta: cuadForm.disponible_hasta || null,
          tarifa_referencia: cuadForm.tarifa_referencia ? Number(cuadForm.tarifa_referencia) : null,
          unidad_tarifa: cuadForm.unidad_tarifa || 'Día',
          contacto_nombre: cuadForm.contacto_nombre.trim() || null,
          contacto_whatsapp: cuadForm.contacto_whatsapp.trim() || null,
          descripcion: cuadForm.descripcion.trim() || null,
          activa: true,
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      setCuadrillasOfertadas([data, ...cuadrillasOfertadas]);
      setMsg('✅ Cuadrilla con capacidad ociosa publicada en el tablero B2B para subcontratación.');
    } catch (err) {
      setMsg('⚠️ Error al ofertar cuadrilla: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleActualizarEstadoPostulacion = async (post, nuevoEstado) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('postulaciones_profesionales')
        .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
        .eq('id', post.id);
      if (error) throw error;

      setPostulaciones((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, estado: nuevoEstado } : p))
      );

      if (nuevoEstado === 'CONTRATADO') {
        const persona = redTalento.find((p) => p.id === post.personal_id) || allPersonal.find((p) => p.id === post.personal_id);
        const conv = convocatorias.find((c) => c.id === post.oferta_id);
        if (persona && onVincularProfesional) {
          onVincularProfesional(persona, conv?.cargo_id || filtroCargoId || null, initialCuadrillaIdx, equipoPadreId);
          setMsg(`✅ ${persona.nombres || persona.nombre} ha sido CONTRATADO y vinculado automáticamente al proyecto.`);
        }
      }
    } catch (err) {
      setMsg('⚠️ No se pudo actualizar la postulación: ' + (err.message || err));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1500 }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 920, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', padding: '16px 22px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
              🌐 Red Bidireccional de Talento & Subcontratación B2B
            </h2>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Proyecto: <strong>{proyecto?.nombre || 'Global'}</strong> {proyecto?.ubicacion ? `(${proyecto.ubicacion})` : ''}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Pestañas */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 22px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
          {[
            { id: 'talento', label: `🔍 Buscar Profesionales y Mano de Obra (${candidatosFiltrados.length})` },
            { id: 'cuadrillas', label: `🤝 Cuadrillas con Capacidad Ociosa (${cuadrillasOfertadas.length})` },
            { id: 'convocatorias', label: `📢 Publicar Vacante y Postulados (${postulaciones.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: tab === t.id ? '1px solid #2563eb' : '1px solid #cbd5e1',
                background: tab === t.id ? '#2563eb' : '#ffffff',
                color: tab === t.id ? '#ffffff' : '#334155',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', padding: 22 }}>
          {msg && (
            <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1px solid #93c5fd', color: '#1e3a8a', borderRadius: 8, fontSize: 12, marginBottom: 16 }}>
              {msg}
            </div>
          )}

          {/* TAB 1: BUSCAR EN RED DE PROFESIONALES */}
          {tab === 'talento' && (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16, alignItems: 'center', background: '#f1f5f9', padding: 12, borderRadius: 10 }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1, minWidth: 200, background: '#fff' }}
                  placeholder="🔍 Filtrar por nombre, profesión o habilidad..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                <select
                  className="form-select"
                  style={{ width: 220, background: '#fff' }}
                  value={filtroCargoId}
                  onChange={(e) => setFiltroCargoId(e.target.value)}
                >
                  <option value="">Todos los cargos / oficios</option>
                  {cargos.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: 160, background: '#fff' }}
                  placeholder="📍 Municipio..."
                  value={filtroMunicipio}
                  onChange={(e) => setFiltroMunicipio(e.target.value)}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
                  <input type="checkbox" checked={soloVerificados} onChange={(e) => setSoloVerificados(e.target.checked)} />
                  Solo ✔ Verificados
                </label>
              </div>

              {loading ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Consultando Red de Talento Kalarti...</div>
              ) : candidatosFiltrados.length === 0 ? (
                <div style={{ padding: 28, textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>No se encontraron profesionales con este filtro</div>
                  <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                    Puedes quitar el filtro de cargo o publicar una convocatoria para que los profesionales de la zona se postulen.
                  </p>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setTab('convocatorias')}>
                    📢 Publicar Vacante para este Rol
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(275px, 1fr))', gap: 12 }}>
                  {candidatosFiltrados.map((p) => {
                    const pCargos = (Array.isArray(p.cargos_ids) ? p.cargos_ids : p.cargo_id ? [p.cargo_id] : [])
                      .map((cid) => cargos.find((c) => c.id === cid)?.nombre)
                      .filter(Boolean);
                    const verif = p.estado_verificacion === 'VERIFICADO';
                    return (
                      <div key={p.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>
                                {p.nombres || p.nombre} {p.apellidos || ''}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{p.profesion || pCargos.join(', ') || 'Especialista de Obra'}</div>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: verif ? '#dcfce7' : '#fef3c7', color: verif ? '#166534' : '#92400e' }}>
                              {verif ? '✔ Verificado' : 'En Red'}
                            </span>
                          </div>

                          {pCargos.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                              {pCargos.slice(0, 4).map((cn, idx) => (
                                <span key={idx} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }}>
                                  {cn}
                                </span>
                              ))}
                            </div>
                          )}

                          <div style={{ fontSize: 11, color: '#475569', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span>📍 Cobertura: {Array.isArray(p.municipios_cobertura) && p.municipios_cobertura.length ? p.municipios_cobertura.join(', ') : p.ciudad || 'Pasto'}</span>
                            {(p.tarifa_referencia || p.salario_base) ? (
                              <span>💰 Tarifa ref: {formatMoney(p.tarifa_referencia || p.salario_base, 'COP')} / {p.tarifa_unidad || p.unidad_pago || 'Mes'}</span>
                            ) : null}
                            <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                              {p.hoja_vida_url && <a href={p.hoja_vida_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#2563eb', fontWeight: 700 }}>📄 HV</a>}
                              {p.tp_url && <a href={p.tp_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#2563eb', fontWeight: 700 }}>🎓 COPNIA/TP</a>}
                              {p.arl_url && <a href={p.arl_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#16a34a', fontWeight: 700 }}>🛡️ ARL</a>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ width: '100%', justifyContent: 'center' }}
                          onClick={() => {
                            if (onVincularProfesional) {
                              onVincularProfesional(p, filtroCargoId || p.cargo_id || null, initialCuadrillaIdx, equipoPadreId);
                              setMsg(`✅ ${p.nombres || p.nombre} vinculado exitosamente a la obra.`);
                            }
                          }}
                        >
                          ⚡ Vincular a Obra en 1 Clic
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CUADRILLAS CON CAPACIDAD OCIOSA */}
          {tab === 'cuadrillas' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, marginTop: 0, marginBottom: 10 }}>
                  🤝 Cuadrillas Disponibles para Subcontratación
                </h3>
                {cuadrillasOfertadas.length === 0 ? (
                  <div style={{ padding: 20, background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1', fontSize: 12, color: '#64748b' }}>
                    Aún no hay cuadrillas publicadas con capacidad ociosa en esta zona. Usa el formulario adjunto para ofertar tu cuadrilla entre fases de obra.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {cuadrillasOfertadas.map((cu) => (
                      <div key={cu.id} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: 14, background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <strong style={{ fontSize: 14 }}>{cu.titulo}</strong>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb' }}>📍 {cu.municipio}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>
                          👥 {cu.integrantes} integrantes · {cu.especialidad || 'Obra Civil'}
                          {cu.tarifa_referencia ? ` · ${formatMoney(cu.tarifa_referencia, 'COP')}/${cu.unidad_tarifa || 'Día'}` : ''}
                        </div>
                        {cu.descripcion && <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px' }}>{cu.descripcion}</p>}
                        {cu.contacto_whatsapp && (
                          <a
                            href={`https://wa.me/${cu.contacto_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, vi su cuadrilla "${cu.titulo}" disponible en la Red B2B Kalarti y me interesa subcontratarla.`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-primary btn-sm"
                            style={{ display: 'inline-block', textDecoration: 'none', fontSize: 11 }}
                          >
                            📱 Contactar por WhatsApp ({cu.contacto_nombre || 'Constructora'})
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handlePublicarCuadrillaOciosa} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, marginTop: 0, marginBottom: 6 }}>
                  📤 Ofertar Cuadrilla con Capacidad Ociosa
                </h3>
                <p style={{ fontSize: 11, color: '#64748b', marginTop: 0, marginBottom: 12 }}>
                  ¿Tienes personal en nómina en tiempo muerto entre etapas de obra? Ofrécelo a otras constructoras de la zona para reducir costos fijos.
                </p>
                <div className="form-group">
                  <label className="form-label">Título de la Cuadrilla *</label>
                  <input className="form-input" required value={cuadForm.titulo} onChange={(e) => setCuadForm({ ...cuadForm, titulo: e.target.value })} placeholder="Ej: Cuadrilla Estructura y Formaletería (1 Oficial + 2 Ayudantes)" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Especialidad</label>
                    <select className="form-select" value={cuadForm.cargo_id} onChange={(e) => setCuadForm({ ...cuadForm, cargo_id: e.target.value })}>
                      <option value="">Seleccionar...</option>
                      {cargos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">N° Integrantes</label>
                    <input type="number" min="1" className="form-input" value={cuadForm.integrantes} onChange={(e) => setCuadForm({ ...cuadForm, integrantes: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Municipio</label>
                    <input className="form-input" value={cuadForm.municipio} onChange={(e) => setCuadForm({ ...cuadForm, municipio: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tarifa por Día (COP)</label>
                    <input type="number" className="form-input" value={cuadForm.tarifa_referencia} onChange={(e) => setCuadForm({ ...cuadForm, tarifa_referencia: e.target.value })} placeholder="Ej: 240000" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Contacto Responsable</label>
                    <input className="form-input" value={cuadForm.contacto_nombre} onChange={(e) => setCuadForm({ ...cuadForm, contacto_nombre: e.target.value })} placeholder="Nombre Ing. / Maestro" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">WhatsApp Contacto *</label>
                    <input className="form-input" required value={cuadForm.contacto_whatsapp} onChange={(e) => setCuadForm({ ...cuadForm, contacto_whatsapp: e.target.value })} placeholder="3001234567" />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                  Publicar Cuadrilla Disponible
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: PUBLICAR CONVOCATORIA Y BANDEJA DE POSTULADOS */}
          {tab === 'convocatorias' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              <form onSubmit={handlePublicarConvocatoria} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, marginTop: 0, marginBottom: 8 }}>
                  📢 Publicar Vacante / Licitación de Mano de Obra
                </h3>
                <div className="form-group">
                  <label className="form-label">Título de la Convocatoria *</label>
                  <input className="form-input" required value={convForm.titulo} onChange={(e) => setConvForm({ ...convForm, titulo: e.target.value })} placeholder="Ej: Oficial Hidrosanitario para Obra Casa Ricaurte" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Cargo / Rol</label>
                    <select className="form-select" value={convForm.cargo_id} onChange={(e) => setConvForm({ ...convForm, cargo_id: e.target.value })}>
                      <option value="">Seleccionar...</option>
                      {cargos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Municipio *</label>
                    <input className="form-input" required value={convForm.municipio} onChange={(e) => setConvForm({ ...convForm, municipio: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Rango Salarial / Tarifa</label>
                    <input className="form-input" value={convForm.salario_rango} onChange={(e) => setConvForm({ ...convForm, salario_rango: e.target.value })} placeholder="Ej: $90.000/día o según destajo" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vacantes</label>
                    <input type="number" min="1" className="form-input" value={convForm.vacantes} onChange={(e) => setConvForm({ ...convForm, vacantes: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción y Requisitos (Alturas, COPNIA, etc.)</label>
                  <textarea rows={3} className="form-input" value={convForm.descripcion} onChange={(e) => setConvForm({ ...convForm, descripcion: e.target.value })} placeholder="Detalle de las actividades a ejecutar..." />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                  Publicar Vacante en la Red Kalarti
                </button>
              </form>

              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, marginTop: 0, marginBottom: 10 }}>
                  📥 Bandeja de Profesionales Postulados ({postulaciones.length})
                </h3>
                {postulaciones.length === 0 ? (
                  <div style={{ padding: 20, background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1', fontSize: 12, color: '#64748b' }}>
                    Aún no hay postulados registrados. Cuando los profesionales apliquen desde `/mi-portal` o `/unete`, aparecerán aquí para contratarlos en 1 clic.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {postulaciones.map((po) => {
                      const cand = redTalento.find((p) => p.id === po.personal_id) || allPersonal.find((p) => p.id === po.personal_id);
                      const conv = convocatorias.find((c) => c.id === po.oferta_id);
                      return (
                        <div key={po.id} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: 12, background: '#fff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <strong style={{ fontSize: 13 }}>{cand?.nombres || cand?.nombre || 'Profesional'} {cand?.apellidos || ''}</strong>
                            <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#eff6ff', color: '#1d4ed8' }}>{po.estado}</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                            Vacante: {conv?.titulo || 'Obra'} {po.tarifa_propuesta ? `· Propuesta: ${formatMoney(po.tarifa_propuesta, 'COP')}` : ''}
                          </div>
                          {po.mensaje && <div style={{ fontSize: 11, color: '#334155', marginBottom: 8 }}>&ldquo;{po.mensaje}&rdquo;</div>}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => handleActualizarEstadoPostulacion(po, 'PRESELECCIONADO')}>
                              ⭐ Preseleccionar
                            </button>
                            <button type="button" className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={() => handleActualizarEstadoPostulacion(po, 'CONTRATADO')}>
                              ✅ Contratar y Vincular a Obra
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: '#ef4444' }} onClick={() => handleActualizarEstadoPostulacion(po, 'RECHAZADO')}>
                              Descartar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
