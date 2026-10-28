'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { personalService } from '@/lib/services';
import { formatMoney } from '@/lib/planes';

const MUNICIPIOS_BASE = [
  'Pasto', 'Ipiales', 'Tumaco', 'Ricaurte', 'Túquerres', 'La Unión', 'Yacuanquer',
  'Cali', 'Popayán', 'Bogotá', 'Medellín', 'Pereira', 'Manizales', 'Armenia',
];

function MiPortalInner() {
  const { user, logout, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const convocatoriaDestacada = searchParams.get('convocatoria');

  const [activeTab, setActiveTab] = useState(convocatoriaDestacada ? 'convocatorias' : 'perfil');
  const [ficha, setFicha] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [cargos, setCargos] = useState([]);
  const [convocatorias, setConvocatorias] = useState([]);
  const [postulaciones, setPostulaciones] = useState([]);
  const [asignacionesObra, setAsignacionesObra] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState('');
  const [msg, setMsg] = useState('');

  // Nuevo certificado SST / Alturas
  const [nuevoCertTipo, setNuevoCertTipo] = useState('Trabajo Seguro en Alturas (Avanzado)');
  const [nuevoCertVence, setNuevoCertVence] = useState('');
  const [nuevoCertUrl, setNuevoCertUrl] = useState('');

  // Modal de postulación rápida
  const [ofertaPostular, setOfertaPostular] = useState(null);
  const [mensajePostulacion, setMensajePostulacion] = useState('');
  const [tarifaPropuesta, setTarifaPropuesta] = useState('');

  useEffect(() => {
    async function cargarTodo() {
      if (!supabase || !user?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [{ data: pr }, { data: cg }, { data: convs }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
          supabase.from('cargos').select('id, codigo, nombre, categoria, unidad').order('nombre'),
          supabase.from('convocatorias_ofertas').select('*').eq('activa', true).order('created_at', { ascending: false }),
        ]);

        if (pr) setPerfil(pr);
        if (cg) setCargos(cg.filter((c) => (c.nombre || '').toLowerCase() !== 'cliente'));
        if (convs) setConvocatorias(convs);

        // Buscar ficha en personal por profile_id, user_id o email
        let { data: pers } = await supabase
          .from('personal')
          .select('*')
          .or(`profile_id.eq.${user.id},user_id.eq.${user.id}`)
          .limit(1)
          .maybeSingle();

        if (!pers && user.email) {
          const { data: porEmail } = await supabase
            .from('personal')
            .select('*')
            .ilike('email', user.email)
            .limit(1)
            .maybeSingle();
          pers = porEmail;
        }

        if (!pers) {
          // Crear ficha inicial si no existe
          const meta = user.user_metadata || {};
          const parts = (meta.nombre || user.email?.split('@')[0] || 'Profesional').split(' ');
          const nueva = {
            profile_id: user.id,
            user_id: user.id,
            email: user.email,
            nombre: meta.nombre || user.email?.split('@')[0] || 'Profesional',
            nombres: parts[0] || '',
            apellidos: parts.slice(1).join(' ') || '',
            telefono: meta.telefono || pr?.telefono || '',
            whatsapp: meta.whatsapp || meta.telefono || pr?.whatsapp || '',
            ciudad: meta.ciudad || pr?.ciudad || 'Pasto',
            pais: meta.pais || 'Colombia',
            profesion: meta.profesion || pr?.profesion || '',
            cargos_ids: Array.isArray(meta.cargos_ids) ? meta.cargos_ids : [],
            disponible_red_talento: true,
            municipios_cobertura: [meta.ciudad || 'Pasto'],
            tarifa_referencia: meta.tarifa_referencia || null,
            tarifa_unidad: meta.tarifa_unidad || 'Día',
          };
          const { data: creada } = await supabase.from('personal').insert(nueva).select().maybeSingle();
          pers = creada || nueva;
        }

        setFicha({
          ...pers,
          cargos_ids: Array.isArray(pers.cargos_ids)
            ? pers.cargos_ids
            : pers.cargo_id
            ? [pers.cargo_id]
            : [],
          municipios_cobertura: Array.isArray(pers.municipios_cobertura) && pers.municipios_cobertura.length
            ? pers.municipios_cobertura
            : [pers.ciudad || 'Pasto'],
          certificaciones: Array.isArray(pers.certificaciones) ? pers.certificaciones : [],
        });

        if (pers?.id) {
          const [{ data: posts }, { data: asigs }] = await Promise.all([
            supabase
              .from('postulaciones_profesionales')
              .select('*')
              .or(`personal_id.eq.${pers.id},user_id.eq.${user.id}`)
              .order('created_at', { ascending: false }),
            supabase
              .from('personal_proyecto')
              .select('*, proyectos(nombre, codigo, ubicacion)')
              .eq('personal_id', pers.id),
          ]);
          if (posts) setPostulaciones(posts);
          if (asigs) setAsignacionesObra(asigs);
        }
      } catch (e) {
        console.error('Error cargando portal profesional:', e);
      } finally {
        setLoading(false);
      }
    }
    cargarTodo();
  }, [user]);

  // Calcular porcentaje de completitud del perfil
  const completitud = useMemo(() => {
    if (!ficha) return 0;
    let pts = 0;
    if (ficha.nombre || ficha.nombres) pts += 15;
    if (ficha.telefono || ficha.whatsapp) pts += 15;
    if (ficha.cedula) pts += 10;
    if (Array.isArray(ficha.cargos_ids) && ficha.cargos_ids.length > 0) pts += 20;
    if (ficha.hoja_vida_url) pts += 15;
    if (ficha.cedula_url) pts += 10;
    if (ficha.tp_url || ficha.arl_url || (ficha.certificaciones && ficha.certificaciones.length > 0)) pts += 15;
    return Math.min(100, pts);
  }, [ficha]);

  const handleSaveFicha = async (e) => {
    if (e) e.preventDefault();
    if (!ficha?.id) return;
    setSaving(true);
    setMsg('');
    try {
      const payload = {
        nombre: `${ficha.nombres || ''} ${ficha.apellidos || ''}`.trim() || ficha.nombre,
        nombres: ficha.nombres || '',
        apellidos: ficha.apellidos || '',
        telefono: ficha.telefono || '',
        whatsapp: ficha.whatsapp || ficha.telefono || '',
        cedula: ficha.cedula || '',
        ciudad: ficha.ciudad || 'Pasto',
        direccion_residencia: ficha.direccion_residencia || '',
        profesion: ficha.profesion || '',
        cargo_id: ficha.cargos_ids?.[0] || ficha.cargo_id || null,
        cargos_ids: ficha.cargos_ids || [],
        tp_numero: ficha.tp_numero || '',
        arl_numero: ficha.arl_numero || '',
        foto_url: ficha.foto_url || '',
        cedula_url: ficha.cedula_url || '',
        hoja_vida_url: ficha.hoja_vida_url || '',
        tp_url: ficha.tp_url || '',
        arl_url: ficha.arl_url || '',
        portafolio_url: ficha.portafolio_url || '',
        certificaciones: ficha.certificaciones || [],
        disponible_red_talento: Boolean(ficha.disponible_red_talento),
        tarifa_referencia: ficha.tarifa_referencia ? Number(ficha.tarifa_referencia) : null,
        tarifa_unidad: ficha.tarifa_unidad || 'Día',
        municipios_cobertura: ficha.municipios_cobertura || ['Pasto'],
        anos_experiencia: Number(ficha.anos_experiencia) || 0,
        resumen_experiencia: ficha.resumen_experiencia || '',
      };

      await personalService.update(ficha.id, payload);
      setMsg('✅ Tu perfil profesional y disponibilidad se han guardado en la Red de Talento.');
    } catch (err) {
      setMsg('⚠️ Error al guardar: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDoc = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(field);
    setMsg('');
    try {
      const url = await personalService.uploadDocument(file, field);
      if (field === 'cert_sst') {
        setNuevoCertUrl(url);
      } else {
        const updated = { ...ficha, [field]: url };
        setFicha(updated);
        if (ficha?.id) {
          await personalService.update(ficha.id, { [field]: url });
        }
      }
      setMsg('✅ Documento subido correctamente.');
    } catch (err) {
      setMsg('⚠️ No se pudo subir el archivo: ' + (err.message || err));
    } finally {
      setUploadingField('');
    }
  };

  const agregarCertificacion = async () => {
    if (!nuevoCertTipo.trim()) return;
    const nuevaLista = [
      ...(ficha.certificaciones || []),
      {
        id: crypto.randomUUID(),
        tipo: nuevoCertTipo,
        vence: nuevoCertVence || null,
        url: nuevoCertUrl || null,
        fecha_carga: new Date().toISOString().slice(0, 10),
      },
    ];
    setFicha({ ...ficha, certificaciones: nuevaLista });
    setNuevoCertVence('');
    setNuevoCertUrl('');
    if (ficha?.id) {
      try {
        await personalService.update(ficha.id, { certificaciones: nuevaLista });
        setMsg('✅ Certificación agregada.');
      } catch {
        // ignore if column not yet migrated
      }
    }
  };

  const handlePostular = async (e) => {
    e.preventDefault();
    if (!ofertaPostular || !ficha?.id || !user?.id) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('postulaciones_profesionales')
        .insert({
          oferta_id: ofertaPostular.id,
          personal_id: ficha.id,
          user_id: user.id,
          estado: 'POSTULADO',
          mensaje: mensajePostulacion.trim() || 'Disponible para iniciar de inmediato.',
          tarifa_propuesta: tarifaPropuesta ? Number(tarifaPropuesta) : ficha.tarifa_referencia || null,
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      setPostulaciones([data, ...postulaciones]);
      setOfertaPostular(null);
      setMensajePostulacion('');
      setMsg('✅ ¡Te has postulado exitosamente a la convocatoria! La constructora revisará tu perfil.');
    } catch (err) {
      setMsg('⚠️ No se pudo registrar la postulación: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#050b16', color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Cargando tu Portal Profesional Kalarti...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#050b16', color: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 42, marginBottom: 12 }}>👷</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8 }}>Portal del Profesional y Cuadrillas</h1>
        <p style={{ color: '#94a3b8', maxWidth: 460, marginBottom: 24, fontSize: 14 }}>
          Inicia sesión o regístrate gratis en la Red de Talento Kalarti para gestionar tu hoja de vida, certificaciones SST y postularte a convocatorias de obra.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/registro?tipo=profesional" style={{ background: '#38bdf8', color: '#0f172a', fontWeight: 800, padding: '12px 22px', borderRadius: 10, textDecoration: 'none', fontSize: 14 }}>
            Crear mi Perfil Gratis ➔
          </Link>
          <Link href="/erp" style={{ border: '1px solid #334155', color: '#f8fafc', fontWeight: 700, padding: '12px 20px', borderRadius: 10, textDecoration: 'none', fontSize: 14 }}>
            Iniciar Sesión
          </Link>
        </div>
      </div>
    );
  }

  const verificado = (perfil?.estado_verificacion || ficha?.estado_verificacion) === 'VERIFICADO';

  return (
    <div style={{ minHeight: '100vh', background: '#050b16', color: '#f8fafc', fontFamily: 'var(--font-inter), sans-serif', paddingBottom: 64 }}>
      {/* Header */}
      <header style={{ background: '#0b1324', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link href="/" style={{ color: '#f8fafc', textDecoration: 'none', fontWeight: 900, fontSize: 18 }}>
              KALARTI
            </Link>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#38bdf8', background: 'rgba(56,189,248,0.12)', padding: '4px 10px', borderRadius: 999 }}>
              👷 PORTAL DEL PROFESIONAL
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: 999,
                background: verificado ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.18)',
                color: verificado ? '#34d399' : '#fbbf24',
              }}
            >
              {verificado ? '✔ PERFIL VERIFICADO' : '⏳ EN VALIDACIÓN DOCUMENTAL'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{user.email}</span>
            <Link href="/erp" style={{ fontSize: 12, color: '#cbd5e1', textDecoration: 'none', padding: '6px 12px', borderRadius: 6, border: '1px solid #334155' }}>
              Vista Campo / ERP
            </Link>
            <button
              type="button"
              onClick={logout}
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 20px' }}>
        {/* Barra de completitud y visibilidad en la Red */}
        <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 14, padding: 20, marginBottom: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc' }}>
                Completitud de tu Perfil Técnico: {completitud}%
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {completitud >= 80 ? '⭐ Excelente visibilidad ante constructoras' : 'Sube tu HV y certificados para destacar'}
              </span>
            </div>
            <div style={{ width: '100%', height: 8, background: '#1e293b', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${completitud}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8, #10b981)', transition: 'width 0.3s' }} />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: ficha?.disponible_red_talento ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${ficha?.disponible_red_talento ? '#10b981' : '#334155'}`, padding: '10px 16px', borderRadius: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={Boolean(ficha?.disponible_red_talento)}
              onChange={(e) => {
                const val = e.target.checked;
                setFicha((prev) => ({ ...prev, disponible_red_talento: val }));
              }}
            />
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: ficha?.disponible_red_talento ? '#34d399' : '#cbd5e1' }}>
                {ficha?.disponible_red_talento ? '🟢 Disponible en Red de Talento' : '⚪ Oculto en Red de Talento'}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>
                Visible para constructoras de tus municipios
              </div>
            </div>
          </label>
        </div>

        {msg && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(56,189,248,0.14)', border: '1px solid #38bdf8', color: '#e0f2fe', fontSize: 13, marginBottom: 20 }}>
            {msg}
          </div>
        )}

        {/* Navegación por Pestañas */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #1e293b', marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { id: 'perfil', label: '👤 1. Perfil y Oficios' },
            { id: 'documentos', label: '📄 2. Documentos, COPNIA y Alturas/SST' },
            { id: 'disponibilidad', label: '📍 3. Cobertura y Tarifas' },
            { id: 'convocatorias', label: `📋 4. Convocatorias (${convocatorias.length})` },
            { id: 'postulaciones', label: `✅ 5. Mis Postulaciones y Obras (${postulaciones.length + asignacionesObra.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '10px 16px',
                borderRadius: '10px 10px 0 0',
                border: 'none',
                background: activeTab === t.id ? '#38bdf8' : 'rgba(15,23,42,0.8)',
                color: activeTab === t.id ? '#0f172a' : '#cbd5e1',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* PESTAÑA 1: PERFIL Y OFICIOS */}
        {activeTab === 'perfil' && ficha && (
          <form onSubmit={handleSaveFicha} style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid #1e293b', borderRadius: 14, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 0, marginBottom: 16 }}>Información Personal y Especialidades</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Nombres</label>
                <input className="form-input" value={ficha.nombres || ''} onChange={(e) => setFicha({ ...ficha, nombres: e.target.value })} style={{ width: '100%', background: '#0b1324', color: '#f8fafc', border: '1px solid #334155', padding: '9px 12px', borderRadius: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Apellidos</label>
                <input className="form-input" value={ficha.apellidos || ''} onChange={(e) => setFicha({ ...ficha, apellidos: e.target.value })} style={{ width: '100%', background: '#0b1324', color: '#f8fafc', border: '1px solid #334155', padding: '9px 12px', borderRadius: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Cédula / NIT</label>
                <input className="form-input" value={ficha.cedula || ''} onChange={(e) => setFicha({ ...ficha, cedula: e.target.value })} style={{ width: '100%', background: '#0b1324', color: '#f8fafc', border: '1px solid #334155', padding: '9px 12px', borderRadius: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Teléfono / WhatsApp</label>
                <input className="form-input" value={ficha.telefono || ''} onChange={(e) => setFicha({ ...ficha, telefono: e.target.value, whatsapp: e.target.value })} style={{ width: '100%', background: '#0b1324', color: '#f8fafc', border: '1px solid #334155', padding: '9px 12px', borderRadius: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Profesión / Título</label>
                <input className="form-input" value={ficha.profesion || ''} onChange={(e) => setFicha({ ...ficha, profesion: e.target.value })} placeholder="Ej: Maestro General / Ing. Civil" style={{ width: '100%', background: '#0b1324', color: '#f8fafc', border: '1px solid #334155', padding: '9px 12px', borderRadius: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Años de Experiencia</label>
                <input type="number" value={ficha.anos_experiencia || 0} onChange={(e) => setFicha({ ...ficha, anos_experiencia: e.target.value })} style={{ width: '100%', background: '#0b1324', color: '#f8fafc', border: '1px solid #334155', padding: '9px 12px', borderRadius: 8 }} />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Resumen de Experiencia y Obras Realizadas</label>
              <textarea
                rows={3}
                value={ficha.resumen_experiencia || ''}
                onChange={(e) => setFicha({ ...ficha, resumen_experiencia: e.target.value })}
                placeholder="Describe brevemente tu experiencia en estructura, mampostería, instalaciones hidrosanitarias, eléctricas, guadua o dirección de obra..."
                style={{ width: '100%', background: '#0b1324', color: '#f8fafc', border: '1px solid #334155', padding: 12, borderRadius: 8, fontSize: 13 }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#38bdf8', marginBottom: 8 }}>
                🛠️ Cargos y Oficios en el ERP ({(ficha.cargos_ids || []).length} seleccionados)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 12, background: '#070d19', borderRadius: 10, border: '1px solid #1e293b', maxHeight: 200, overflowY: 'auto' }}>
                {cargos.map((c) => {
                  const sel = (ficha.cargos_ids || []).includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        const list = ficha.cargos_ids || [];
                        const next = sel ? list.filter((x) => x !== c.id) : [...list, c.id];
                        setFicha({ ...ficha, cargos_ids: next });
                      }}
                      style={{
                        padding: '5px 11px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: sel ? '1px solid #38bdf8' : '1px solid #334155',
                        background: sel ? 'rgba(56,189,248,0.22)' : 'transparent',
                        color: sel ? '#38bdf8' : '#cbd5e1',
                      }}
                    >
                      {sel ? '✓ ' : '+ '}{c.nombre}
                    </button>
                  );
                })}
              </div>
            </div>

            <button type="submit" disabled={saving} style={{ background: '#38bdf8', color: '#0f172a', fontWeight: 900, padding: '12px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14 }}>
              {saving ? 'Guardando...' : '💾 Guardar Mi Perfil Profesional'}
            </button>
          </form>
        )}

        {/* PESTAÑA 2: DOCUMENTOS Y CERTIFICACIONES */}
        {activeTab === 'documentos' && ficha && (
          <div style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid #1e293b', borderRadius: 14, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 0, marginBottom: 6 }}>
              Soporte Documental para Sello ✔ Verificado
            </h2>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 0, marginBottom: 20 }}>
              Tus documentos están protegidos bajo la Ley 1581. Solo el equipo verificador de Kalarti y las constructoras a las que te postules podrán consultarlos.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 28 }}>
              {[
                { key: 'hoja_vida_url', label: '📄 Hoja de Vida (PDF)', desc: 'Experiencia laboral y referencias' },
                { key: 'cedula_url', label: '🪪 Documento de Identidad / RUT', desc: 'Cédula de ciudadanía o NIT' },
                { key: 'tp_url', label: '🎓 Tarjeta Profesional (COPNIA / CONTE)', desc: 'Para ingenieros, arquitectos y técnicos', extraField: 'tp_numero', extraPlaceholder: 'Nº Matrícula Profesional' },
                { key: 'arl_url', label: '🛡️ Certificado Afiliación ARL / EPS', desc: 'Seguridad social vigente', extraField: 'arl_numero', extraPlaceholder: 'Nombre ARL (Sura, Positiva...)' },
                { key: 'portafolio_url', label: '📸 Portafolio de Obras (PDF o Imagen)', desc: 'Fotos de trabajos ejecutados' },
              ].map((doc) => (
                <div key={doc.key} style={{ background: '#0b1324', border: '1px solid #334155', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{doc.label}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>{doc.desc}</div>
                  {doc.extraField && (
                    <input
                      type="text"
                      value={ficha[doc.extraField] || ''}
                      onChange={(e) => setFicha({ ...ficha, [doc.extraField]: e.target.value })}
                      placeholder={doc.extraPlaceholder}
                      style={{ width: '100%', marginBottom: 8, padding: '6px 10px', borderRadius: 6, border: '1px solid #334155', background: '#050b16', color: '#f8fafc', fontSize: 12 }}
                    />
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <label style={{ background: '#1e293b', color: '#38bdf8', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {uploadingField === doc.key ? 'Subiendo...' : ficha[doc.key] ? 'Reemplazar archivo' : 'Subir archivo'}
                      <input type="file" accept=".pdf,image/*" onChange={(e) => handleUploadDoc(e, doc.key)} style={{ display: 'none' }} />
                    </label>
                    {ficha[doc.key] && (
                      <a href={ficha[doc.key]} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>
                        ✓ Ver cargado
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Certificaciones de Trabajo en Alturas / SST */}
            <div style={{ borderTop: '1px solid #1e293b', paddingTop: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>
                ⛑️ Certificados de Trabajo en Alturas, SST y Cursos Especiales
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16, alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Tipo de Certificado</label>
                  <input
                    type="text"
                    value={nuevoCertTipo}
                    onChange={(e) => setNuevoCertTipo(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0b1324', color: '#f8fafc', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Fecha Vencimiento</label>
                  <input
                    type="date"
                    value={nuevoCertVence}
                    onChange={(e) => setNuevoCertVence(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0b1324', color: '#f8fafc', fontSize: 12 }}
                  />
                </div>
                <label style={{ background: '#1e293b', color: '#cbd5e1', padding: '8px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                  {uploadingField === 'cert_sst' ? 'Subiendo...' : nuevoCertUrl ? '✓ PDF Listo' : '📎 Adjuntar PDF'}
                  <input type="file" accept=".pdf,image/*" onChange={(e) => handleUploadDoc(e, 'cert_sst')} style={{ display: 'none' }} />
                </label>
                <button
                  type="button"
                  onClick={agregarCertificacion}
                  style={{ background: '#10b981', color: '#0f172a', fontWeight: 800, padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12 }}
                >
                  + Agregar Certificado
                </button>
              </div>

              {(ficha.certificaciones || []).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ficha.certificaciones.map((c, idx) => (
                    <div key={c.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0b1324', padding: '10px 14px', borderRadius: 8, border: '1px solid #1e293b', fontSize: 12 }}>
                      <div>
                        <strong style={{ color: '#f8fafc' }}>⛑️ {c.tipo}</strong>
                        {c.vence && <span style={{ color: '#94a3b8', marginLeft: 10 }}>Vence: {c.vence}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {c.url && <a href={c.url} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>Ver soporte</a>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 3: DISPONIBILIDAD Y TARIFAS */}
        {activeTab === 'disponibilidad' && ficha && (
          <form onSubmit={handleSaveFicha} style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid #1e293b', borderRadius: 14, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 0, marginBottom: 14 }}>
              Configuración de Disponibilidad, Municipios y Tarifas
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Tarifa de Referencia (COP)</label>
                <input
                  type="number"
                  value={ficha.tarifa_referencia || ''}
                  onChange={(e) => setFicha({ ...ficha, tarifa_referencia: e.target.value })}
                  placeholder="Ej: 90000"
                  style={{ width: '100%', background: '#0b1324', color: '#f8fafc', border: '1px solid #334155', padding: '9px 12px', borderRadius: 8 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Unidad de Cobro</label>
                <select
                  value={ficha.tarifa_unidad || 'Día'}
                  onChange={(e) => setFicha({ ...ficha, tarifa_unidad: e.target.value })}
                  style={{ width: '100%', background: '#0b1324', color: '#f8fafc', border: '1px solid #334155', padding: '9px 12px', borderRadius: 8 }}
                >
                  <option value="Día">Jornal / Día</option>
                  <option value="Mes">Mensualidad / Mes</option>
                  <option value="Hora">Por Hora</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 }}>
                📍 Municipios de Cobertura (donde puedes ejecutar obra)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {MUNICIPIOS_BASE.map((mun) => {
                  const active = (ficha.municipios_cobertura || []).includes(mun);
                  return (
                    <button
                      key={mun}
                      type="button"
                      onClick={() => {
                        const curr = ficha.municipios_cobertura || [];
                        const next = active ? curr.filter((m) => m !== mun) : [...curr, mun];
                        setFicha({ ...ficha, municipios_cobertura: next.length ? next : ['Pasto'] });
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: active ? '1px solid #10b981' : '1px solid #334155',
                        background: active ? 'rgba(16,185,129,0.2)' : '#0b1324',
                        color: active ? '#34d399' : '#94a3b8',
                      }}
                    >
                      {active ? '✓ ' : '+ '}{mun}
                    </button>
                  );
                })}
              </div>
            </div>

            <button type="submit" disabled={saving} style={{ background: '#10b981', color: '#0f172a', fontWeight: 900, padding: '12px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14 }}>
              {saving ? 'Guardando...' : '💾 Actualizar Disponibilidad en la Red'}
            </button>
          </form>
        )}

        {/* PESTAÑA 4: CONVOCATORIAS ABIERTAS */}
        {activeTab === 'convocatorias' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 0, marginBottom: 14 }}>
              📋 Convocatorias de Obra y Licitaciones Abiertas
            </h2>
            {convocatorias.length === 0 ? (
              <div style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid #1e293b', borderRadius: 14, padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                No hay convocatorias abiertas en este momento. Mantén activo tu estado &ldquo;Disponible en Red de Talento&rdquo; para que las constructoras te vinculen directamente a sus proyectos.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 16 }}>
                {convocatorias.map((co) => {
                  const yaPostulado = postulaciones.some((p) => p.oferta_id === co.id);
                  const cargoNombre = cargos.find((c) => c.id === co.cargo_id)?.nombre;
                  return (
                    <div key={co.id} style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(56,189,248,0.28)', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>📍 {co.municipio}</span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>{co.tipo_contrato || 'Obra o Labor'}</span>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{co.titulo}</div>
                        {cargoNombre && <div style={{ fontSize: 12, color: '#d4af37', fontWeight: 700, marginBottom: 4 }}>Cargo requerido: {cargoNombre}</div>}
                        {co.salario_rango && <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700, marginBottom: 6 }}>💰 {co.salario_rango}</div>}
                        {co.descripcion && <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{co.descripcion}</p>}
                      </div>
                      <div>
                        {yaPostulado ? (
                          <span style={{ display: 'inline-block', background: 'rgba(16,185,129,0.2)', color: '#34d399', fontWeight: 800, fontSize: 12, padding: '6px 12px', borderRadius: 6 }}>
                            ✓ Ya estás postulado
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setOfertaPostular(co);
                              setTarifaPropuesta(ficha?.tarifa_referencia || '');
                            }}
                            style={{ width: '100%', background: '#38bdf8', color: '#0f172a', fontWeight: 800, fontSize: 13, padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
                          >
                            Postularme a esta Obra ➔
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 5: MIS POSTULACIONES Y OBRAS ASIGNADAS */}
        {activeTab === 'postulaciones' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid #1e293b', borderRadius: 14, padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginTop: 0, marginBottom: 12 }}>
                🏗️ Obras donde estás vinculado actualmente ({asignacionesObra.length})
              </h3>
              {asignacionesObra.length === 0 ? (
                <div style={{ fontSize: 13, color: '#94a3b8' }}>Aún no tienes asignaciones activas en proyectos del ERP.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {asignacionesObra.map((asig) => (
                    <div key={asig.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: '#0b1324', borderRadius: 8, border: '1px solid #334155' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>{asig.proyectos?.nombre || 'Proyecto de Obra'}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                          {asig.proyectos?.ubicacion || ''} · {formatMoney(asig.salario_pactado || 0, 'COP')} / {asig.unidad_pactada || 'Mes'}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#34d399', background: 'rgba(16,185,129,0.18)', padding: '4px 10px', borderRadius: 999 }}>
                        ACTIVO EN OBRA
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid #1e293b', borderRadius: 14, padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginTop: 0, marginBottom: 12 }}>
                📩 Historial de Postulaciones a Convocatorias ({postulaciones.length})
              </h3>
              {postulaciones.length === 0 ? (
                <div style={{ fontSize: 13, color: '#94a3b8' }}>No has enviado postulaciones todavía.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {postulaciones.map((po) => {
                    const conv = convocatorias.find((c) => c.id === po.oferta_id);
                    return (
                      <div key={po.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: '#0b1324', borderRadius: 8, border: '1px solid #334155' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14 }}>{conv?.titulo || 'Convocatoria de Obra'}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>{po.mensaje}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: po.estado === 'CONTRATADO' ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.18)', color: po.estado === 'CONTRATADO' ? '#34d399' : '#38bdf8' }}>
                          {po.estado}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal para confirmar postulación */}
      {ofertaPostular && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }} onClick={() => setOfertaPostular(null)}>
          <form onSubmit={handlePostular} onClick={(e) => e.stopPropagation()} style={{ background: '#0f172a', border: '1px solid #38bdf8', borderRadius: 14, padding: 24, maxWidth: 460, width: '100%' }}>
            <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: 800 }}>Postularme a: {ofertaPostular.titulo}</h3>
            <p style={{ fontSize: 12, color: '#94a3b8' }}>
              Al postularte autorizas compartir tu perfil técnico, teléfono y soportes documentales con la constructora responsable de esta obra.
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>Tu tarifa propuesta (COP)</label>
              <input type="number" value={tarifaPropuesta} onChange={(e) => setTarifaPropuesta(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', background: '#050b16', color: '#f8fafc' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>Mensaje o disponibilidad</label>
              <textarea rows={3} value={mensajePostulacion} onChange={(e) => setMensajePostulacion(e.target.value)} placeholder="Ej: Cuento con curso de alturas vigente y herramienta menor..." style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#050b16', color: '#f8fafc', fontSize: 12 }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setOfertaPostular(null)} style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="submit" disabled={saving} style={{ background: '#38bdf8', color: '#0f172a', fontWeight: 800, padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer' }}>
                {saving ? 'Enviando...' : 'Confirmar Postulación'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function MiPortalPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#050b16', color: '#f8fafc', padding: 48, textAlign: 'center' }}>Cargando portal profesional...</div>}>
      <MiPortalInner />
    </Suspense>
  );
}
