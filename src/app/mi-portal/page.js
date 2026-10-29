'use client';

import { Suspense, useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { sincronizarIdentidad } from '@/lib/identidad';

const MUNICIPIOS_SUGERIDOS = [
  'Pasto',
  'Ipiales',
  'Tumaco',
  'Túquerres',
  'La Unión',
  'Samaniego',
  'Sandoná',
  'Chachagüí',
  'Buesaco',
  'Cumbal',
  'El Bordo',
  'Popayán',
  'Cali',
  'Medellín',
  'Bogotá',
];

const ETAPAS_CRM = [
  'NUEVO',
  'CONTACTADO',
  'VISITA_PROGRAMADA',
  'PROPUESTA',
  'CIERRE_GANADO',
  'DESCARTADO',
];

function MiPortalInner() {
  const { user, loading: authLoading, signOut } = useAuth();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') || '';

  const [activeTab, setActiveTab] = useState('perfil');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState('');
  const [saveBanner, setSaveBanner] = useState('');

  const [perfil, setPerfil] = useState(null);
  const [ficha, setFicha] = useState(null);
  const [cargosCatalogo, setCargosCatalogo] = useState([]);
  const [convocatorias, setConvocatorias] = useState([]);
  const [postulaciones, setPostulaciones] = useState([]);
  const [asignacionesObra, setAsignacionesObra] = useState([]);
  const [filtroConvMunicipio, setFiltroConvMunicipio] = useState('');

  // Estado Inmobiliario (Particular 3% e Inmobiliaria 0.3%)
  const [modalidadInm, setModalidadInm] = useState('PARTICULAR_3'); // 'PARTICULAR_3' | 'INMOBILIARIA_03'
  const [misInmuebles, setMisInmuebles] = useState([]);
  const [misCorredores, setMisCorredores] = useState([]);
  const [misLeadsInm, setMisLeadsInm] = useState([]);
  const [inmSubTab, setInmSubTab] = useState('cartera'); // 'cartera' | 'nuevo' | 'corredores' | 'crm'
  const [inmForm, setInmForm] = useState({
    titulo: '',
    tipo: 'Apartamento',
    operacion: 'VENTA',
    precio: '',
    ciudad: 'Pasto',
    departamento: 'Nariño',
    direccion: '',
    area_terreno: '',
    area_construida: '',
    habitaciones: '',
    banos: '',
    parqueaderos: '',
    descripcion: '',
    portada_url: '',
    propietario_nombre: '',
    propietario_telefono: '',
    propietario_documento: '',
    matricula_inmobiliaria: '',
    corredor_id: '',
    acepta_contrato_comision: false,
    acepta_habeas_data: false,
  });
  const [corredorForm, setCorredorForm] = useState({
    nombre: '',
    documento: '',
    email: '',
    telefono: '',
    ciudad: 'Pasto',
    cargo: 'Corredor Inmobiliario',
    comision_interna_pct: '1.5',
  });

  const [form, setForm] = useState({
    nombres: '',
    apellidos: '',
    telefono: '',
    whatsapp: '',
    tipo_documento: 'CC',
    cedula: '',
    ciudad: 'Pasto',
    direccion_residencia: '',
    pais: 'Colombia',
    profesion: '',
    anos_experiencia: 0,
    resumen_experiencia: '',
    cargos_ids: [],
    tarifa_referencia: '',
    tarifa_unidad: 'Día',
    municipios_cobertura: ['Pasto'],
    disponible_red_talento: true,
    tp_numero: '',
    arl_numero: '',
    foto_url: '',
    cedula_url: '',
    hoja_vida_url: '',
    hoja_vida_nombre: '',
    tp_url: '',
    arl_url: '',
    portafolio_url: '',
    portafolio_nombre: '',
    diplomas_url: '',
    diplomas_nombre: '',
    certificaciones: [],
  });

  const [nuevoMunicipio, setNuevoMunicipio] = useState('');

  useEffect(() => {
    if (tabParam === 'inmuebles') {
      setActiveTab('inmuebles');
    }
  }, [tabParam]);

  const cargarTodo = useCallback(async () => {
    if (!supabase || !user?.id) return;
    setLoading(true);
    try {
      await sincronizarIdentidad(user);

      const [profRes, persRes, cargosRes, convRes, postRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase
          .from('personal')
          .select('*')
          .or(`profile_id.eq.${user.id},user_id.eq.${user.id}`)
          .limit(1)
          .maybeSingle(),
        supabase.from('cargos').select('id, codigo, nombre, categoria, unidad').order('nombre'),
        supabase
          .from('convocatorias_ofertas')
          .select('*, cargos(nombre, codigo), proyectos(nombre)')
          .eq('activa', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('postulaciones_profesionales')
          .select('*, convocatorias_ofertas(titulo, municipio, salario_rango, tipo_contrato)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      const pf = profRes.data || null;
      const pe = persRes.data || null;
      setPerfil(pf);
      setFicha(pe);
      if (Array.isArray(cargosRes.data)) setCargosCatalogo(cargosRes.data);
      if (Array.isArray(convRes.data)) setConvocatorias(convRes.data);
      if (Array.isArray(postRes.data)) setPostulaciones(postRes.data);

      const metaMod = user?.user_metadata?.modalidad_inmueble || pf?.tipo_registro || '';
      if (String(metaMod).toUpperCase() === 'INMOBILIARIA') {
        setModalidadInm('INMOBILIARIA_03');
      }

      if (pe?.id) {
        const { data: asigData } = await supabase
          .from('personal_proyecto')
          .select('*, proyectos(nombre, codigo), cargos(nombre)')
          .eq('personal_id', pe.id);
        if (Array.isArray(asigData)) setAsignacionesObra(asigData);
      }

      // Cargar cartera inmobiliaria del usuario / organización
      try {
        const { data: inmData } = await supabase
          .from('inmuebles')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (Array.isArray(inmData)) setMisInmuebles(inmData);
      } catch {
        // Ignorar si user_id aún no está migrado
      }

      try {
        const { data: corrData } = await supabase
          .from('inmueble_corredores')
          .select('*')
          .order('created_at', { ascending: false });
        if (Array.isArray(corrData)) setMisCorredores(corrData);
      } catch {
        // Tabla aún no migrada
      }

      try {
        const { data: leadsData } = await supabase
          .from('inmueble_leads')
          .select('*, inmuebles(titulo, ciudad, modalidad_publicacion)')
          .order('created_at', { ascending: false });
        if (Array.isArray(leadsData)) setMisLeadsInm(leadsData);
      } catch {
        // Ignorar
      }

      const fullNombre = pe?.nombre || pf?.nombre || user.user_metadata?.nombre || '';
      const parts = fullNombre.trim().split(' ');
      setForm({
        nombres: pe?.nombres || parts[0] || '',
        apellidos: pe?.apellidos || parts.slice(1).join(' ') || '',
        telefono: pe?.telefono || pf?.telefono || user.user_metadata?.telefono || '',
        whatsapp: pe?.whatsapp || pf?.whatsapp || pe?.telefono || '',
        tipo_documento: pe?.tipo_documento || 'CC',
        cedula: pe?.cedula || pf?.documento || '',
        ciudad: pe?.ciudad || pf?.ciudad || 'Pasto',
        direccion_residencia: pe?.direccion_residencia || '',
        pais: pe?.pais || pf?.pais || 'Colombia',
        profesion: pe?.profesion || pf?.profesion || '',
        anos_experiencia: pe?.anos_experiencia ?? 0,
        resumen_experiencia: pe?.resumen_experiencia || '',
        cargos_ids: Array.isArray(pe?.cargos_ids)
          ? pe.cargos_ids
          : pe?.cargo_id
            ? [pe.cargo_id]
            : [],
        tarifa_referencia: pe?.tarifa_referencia ?? '',
        tarifa_unidad: pe?.tarifa_unidad || pe?.unidad_pago || 'Día',
        municipios_cobertura:
          Array.isArray(pe?.municipios_cobertura) && pe.municipios_cobertura.length > 0
            ? pe.municipios_cobertura
            : [pe?.ciudad || pf?.ciudad || 'Pasto'],
        disponible_red_talento: pe?.disponible_red_talento ?? true,
        tp_numero: pe?.tp_numero || '',
        arl_numero: pe?.arl_numero || '',
        foto_url: pe?.foto_url || '',
        cedula_url: pe?.cedula_url || '',
        hoja_vida_url: pe?.hoja_vida_url || '',
        hoja_vida_nombre: pe?.hoja_vida_nombre || '',
        tp_url: pe?.tp_url || '',
        arl_url: pe?.arl_url || '',
        portafolio_url: pe?.portafolio_url || '',
        portafolio_nombre: pe?.portafolio_nombre || '',
        diplomas_url: pe?.diplomas_url || '',
        diplomas_nombre: pe?.diplomas_nombre || '',
        certificaciones: Array.isArray(pe?.certificaciones) ? pe.certificaciones : [],
      });

      setInmForm((prev) => ({
        ...prev,
        propietario_nombre: fullNombre,
        propietario_telefono: pe?.telefono || pf?.telefono || '',
        propietario_documento: pe?.cedula || pf?.documento || '',
      }));
    } catch (e) {
      console.warn('Error cargando portal:', e?.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) cargarTodo();
  }, [user, cargarTodo]);

  const progresoPerfil = useMemo(() => {
    const checks = [
      Boolean(form.nombres && form.telefono),
      Boolean(form.cedula),
      Boolean(form.profesion),
      form.cargos_ids.length > 0,
      Boolean(form.cedula_url),
      Boolean(form.hoja_vida_url),
      Boolean(form.tp_url || form.tp_numero || form.arl_url || form.arl_numero),
      Boolean(form.tarifa_referencia),
    ];
    const ok = checks.filter(Boolean).length;
    return Math.round((ok / checks.length) * 100);
  }, [form]);

  const guardarFicha = async (override = {}) => {
    if (!supabase || !user?.id) return;
    setSaving(true);
    setSaveBanner('');
    try {
      const merged = { ...form, ...override };
      const nombreCompleto = `${merged.nombres || ''} ${merged.apellidos || ''}`.trim() || user.email.split('@')[0];

      const payloadPersonal = {
        nombre: nombreCompleto,
        nombres: merged.nombres,
        apellidos: merged.apellidos,
        email: user.email,
        telefono: merged.telefono || null,
        whatsapp: merged.whatsapp || merged.telefono || null,
        tipo_documento: merged.tipo_documento || 'CC',
        cedula: merged.cedula || null,
        ciudad: merged.ciudad || 'Pasto',
        direccion_residencia: merged.direccion_residencia || null,
        pais: merged.pais || 'Colombia',
        profesion: merged.profesion || null,
        anos_experiencia: Number(merged.anos_experiencia) || 0,
        resumen_experiencia: merged.resumen_experiencia || null,
        cargo_id: merged.cargos_ids[0] || null,
        cargos_ids: merged.cargos_ids,
        tarifa_referencia: merged.tarifa_referencia ? Number(merged.tarifa_referencia) : null,
        tarifa_unidad: merged.tarifa_unidad || 'Día',
        unidad_pago: merged.tarifa_unidad || 'Día',
        municipios_cobertura: merged.municipios_cobertura,
        disponible_red_talento: Boolean(merged.disponible_red_talento),
        tp_numero: merged.tp_numero || null,
        arl_numero: merged.arl_numero || null,
        foto_url: merged.foto_url || null,
        cedula_url: merged.cedula_url || null,
        hoja_vida_url: merged.hoja_vida_url || null,
        hoja_vida_nombre: merged.hoja_vida_nombre || null,
        tp_url: merged.tp_url || null,
        arl_url: merged.arl_url || null,
        portafolio_url: merged.portafolio_url || null,
        portafolio_nombre: merged.portafolio_nombre || null,
        diplomas_url: merged.diplomas_url || null,
        diplomas_nombre: merged.diplomas_nombre || null,
        certificaciones: merged.certificaciones || [],
        user_id: user.id,
        profile_id: user.id,
      };

      if (ficha?.id) {
        const { error } = await supabase.from('personal').update(payloadPersonal).eq('id', ficha.id);
        if (error) {
          const {
            certificaciones: _c,
            disponible_red_talento: _d,
            tarifa_referencia: _t,
            tarifa_unidad: _tu,
            municipios_cobertura: _m,
            anos_experiencia: _ae,
            resumen_experiencia: _re,
            ...core
          } = payloadPersonal;
          await supabase.from('personal').update(core).eq('id', ficha.id);
        }
      } else {
        const { data: created } = await supabase.from('personal').insert(payloadPersonal).select().maybeSingle();
        if (created) setFicha(created);
      }

      await supabase
        .from('profiles')
        .update({
          nombre: nombreCompleto,
          telefono: merged.telefono || null,
          whatsapp: merged.whatsapp || merged.telefono || null,
          documento: merged.cedula || null,
          ciudad: merged.ciudad || 'Pasto',
          profesion: merged.profesion || null,
        })
        .eq('id', user.id);

      setSaveBanner('Cambios guardados y sincronizados.');
      setTimeout(() => setSaveBanner(''), 4000);
    } catch (e) {
      alert('Error guardando cambios: ' + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDocument = async (e, urlField, nameField = null) => {
    const file = e.target.files?.[0];
    if (!file || !supabase || !user?.id) return;
    setUploadingField(urlField);
    try {
      const ext = file.name.split('.').pop();
      const safePath = `talento/${user.id}/${urlField}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('personal_docs')
        .upload(safePath, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('personal_docs').getPublicUrl(safePath);
      const publicUrl = pub?.publicUrl || '';
      const updates = { [urlField]: publicUrl };
      if (nameField) updates[nameField] = file.name;

      setForm((prev) => ({ ...prev, ...updates }));
      await guardarFicha(updates);
    } catch (err) {
      alert('No se pudo subir el documento: ' + (err?.message || err));
    } finally {
      setUploadingField('');
    }
  };

  const postularseAConvocatoria = async (ofertaId) => {
    if (!supabase || !user?.id) return;
    try {
      let personalId = ficha?.id;
      if (!personalId) {
        await guardarFicha();
        const { data: p } = await supabase
          .from('personal')
          .select('id')
          .or(`profile_id.eq.${user.id},user_id.eq.${user.id}`)
          .limit(1)
          .maybeSingle();
        personalId = p?.id;
      }

      const { error } = await supabase.from('postulaciones_profesionales').insert({
        oferta_id: ofertaId,
        personal_id: personalId,
        user_id: user.id,
        estado: 'POSTULADO',
        tarifa_propuesta: form.tarifa_referencia ? Number(form.tarifa_referencia) : null,
      });

      if (error) {
        if (error.message?.includes('duplicate')) {
          alert('Ya se encuentra postulado a esta convocatoria.');
          return;
        }
        throw error;
      }

      setSaveBanner('Postulación registrada.');
      await cargarTodo();
    } catch (e) {
      alert('No fue posible registrar la postulación: ' + (e?.message || e));
    }
  };

  // Acciones Inmobiliarias (Particular 3% e Inmobiliaria 0.3%)
  const handlePublicarInmueble = async (e) => {
    e.preventDefault();
    if (!inmForm.acepta_contrato_comision || !inmForm.acepta_habeas_data) {
      alert('Debe aceptar el contrato de comisión y la política de privacidad (Ley 1581 de 2012).');
      return;
    }
    setSaving(true);
    try {
      const esInmob = modalidadInm === 'INMOBILIARIA_03';
      const comisionPct = esInmob ? 0.3 : 3.0;
      const payload = {
        titulo: inmForm.titulo.trim(),
        descripcion: inmForm.descripcion.trim(),
        tipo: inmForm.tipo,
        operacion: inmForm.operacion,
        precio: Number(inmForm.precio) || 0,
        ciudad: inmForm.ciudad.trim() || 'Pasto',
        departamento: inmForm.departamento.trim() || 'Nariño',
        direccion: inmForm.direccion.trim(),
        portada_url: inmForm.portada_url.trim() || '/icon.png',
        area_terreno: Number(inmForm.area_terreno) || 0,
        area_construida: Number(inmForm.area_construida) || 0,
        habitaciones: Number(inmForm.habitaciones) || 0,
        banos: Number(inmForm.banos) || 0,
        parqueaderos: Number(inmForm.parqueaderos) || 0,
        propietario_nombre: inmForm.propietario_nombre.trim(),
        propietario_telefono: inmForm.propietario_telefono.trim(),
        propietario_documento: inmForm.propietario_documento.trim() || null,
        matricula_inmobiliaria: inmForm.matricula_inmobiliaria.trim() || null,
        comision_pct: comisionPct,
        comision_plataforma_pct: comisionPct,
        modalidad_publicacion: modalidadInm,
        corredor_id: inmForm.corredor_id || null,
        acepta_contrato_comision: true,
        fecha_aceptacion_contrato: new Date().toISOString(),
        acepta_habeas_data: true,
        estado: 'DISPONIBLE',
        user_id: user.id,
      };

      let { error } = await supabase.from('inmuebles').insert(payload);
      if (error) {
        // Fallback si migration-fase23 aún no se ha ejecutado
        const {
          propietario_documento: _pd,
          matricula_inmobiliaria: _mi,
          comision_plataforma_pct: _cp,
          modalidad_publicacion: _mp,
          corredor_id: _ci,
          acepta_contrato_comision: _ac,
          fecha_aceptacion_contrato: _fa,
          acepta_habeas_data: _ah,
          ...safePayload
        } = payload;
        const retry = await supabase.from('inmuebles').insert(safePayload);
        error = retry.error;
      }
      if (error) throw error;

      setSaveBanner(
        esInmob
          ? 'Inmueble publicado bajo modalidad Inmobiliaria (comisión plataforma 0.3%).'
          : 'Inmueble registrado bajo consignación asistida Kalarti (comisión 3.0%). Nuestros corredores iniciarán la gestión.'
      );
      setInmForm((prev) => ({
        ...prev,
        titulo: '',
        precio: '',
        direccion: '',
        area_terreno: '',
        area_construida: '',
        descripcion: '',
        matricula_inmobiliaria: '',
        acepta_contrato_comision: false,
      }));
      setInmSubTab('cartera');
      await cargarTodo();
    } catch (err) {
      alert('No se pudo publicar el inmueble: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleCrearCorredor = async (e) => {
    e.preventDefault();
    if (!corredorForm.nombre.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('inmueble_corredores').insert({
        creado_por: user.id,
        nombre: corredorForm.nombre.trim(),
        documento: corredorForm.documento.trim() || null,
        email: corredorForm.email.trim() || null,
        telefono: corredorForm.telefono.trim() || null,
        whatsapp: corredorForm.telefono.trim() || null,
        ciudad: corredorForm.ciudad.trim() || 'Pasto',
        cargo: corredorForm.cargo.trim() || 'Corredor Inmobiliario',
        comision_interna_pct: Number(corredorForm.comision_interna_pct) || 0,
        activo: true,
      });
      if (error) throw error;
      setCorredorForm({
        nombre: '',
        documento: '',
        email: '',
        telefono: '',
        ciudad: 'Pasto',
        cargo: 'Corredor Inmobiliario',
        comision_interna_pct: '1.5',
      });
      setSaveBanner('Perfil de corredor creado.');
      await cargarTodo();
    } catch (err) {
      alert('Ejecute migration-fase23-inmuebles-corredores.sql en Supabase para habilitar multi-corredor: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const actualizarLeadCrm = async (leadId, cambios) => {
    try {
      const { error } = await supabase.from('inmueble_leads').update(cambios).eq('id', leadId);
      if (error) throw error;
      await cargarTodo();
    } catch (err) {
      alert('No se pudo actualizar el prospecto: ' + (err?.message || err));
    }
  };

  if (authLoading || (user && loading)) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
        Cargando Portal Privado Kalarti...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 460, width: '100%', border: '1px solid #cbd5e1', borderRadius: 4, padding: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            Acceso Restringido
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 10px 0' }}>Portal Privado de Perfil</h1>
          <p style={{ color: '#475569', fontSize: 14, marginBottom: 22, lineHeight: 1.55 }}>
            Inicie sesión o regístrese para administrar su hoja de vida, postulaciones a obra, cartera de inmuebles y
            seguimiento de prospectos.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link
              href="/erp"
              style={{ background: '#0f172a', color: '#ffffff', padding: '10px 18px', borderRadius: 4, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}
            >
              Iniciar Sesión ➔
            </Link>
            <Link
              href="/registro"
              style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #0f172a', padding: '10px 18px', borderRadius: 4, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}
            >
              Crear Cuenta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const estadoVerif = perfil?.estado_verificacion || ficha?.estado_verificacion || 'PENDIENTE';
  const postuladosSet = new Set(postulaciones.map((p) => p.oferta_id));

  return (
    <div className="portal-manual">
      <style>{`
        .portal-manual {
          min-height: 100vh;
          background: #ffffff;
          color: #0f172a;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          line-height: 1.6;
        }
        .portal-header {
          border-bottom: 1px solid #e2e8f0;
          padding: 16px 28px;
          background: #ffffff;
          position: sticky;
          top: 0;
          z-index: 40;
        }
        .portal-header-inner {
          max-width: 1180px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .portal-container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 32px 28px 80px;
        }
        .portal-summary-box {
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 24px;
          margin-bottom: 24px;
          background: #ffffff;
        }
        .portal-tabs {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 12px;
          margin-bottom: 24px;
        }
        .portal-tab-btn {
          background: #ffffff;
          color: #475569;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 8px 14px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
        }
        .portal-tab-btn.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }
        .portal-card {
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 24px;
          background: #ffffff;
          margin-bottom: 20px;
        }
        .portal-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .portal-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        .portal-label {
          display: block;
          font-size: 11.5px;
          font-weight: 700;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 6px;
        }
        .portal-input {
          width: 100%;
          padding: 9px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          background: #ffffff;
          color: #0f172a;
          font-size: 13.5px;
          box-sizing: border-box;
        }
        .portal-btn-dark {
          background: #0f172a;
          color: #ffffff;
          border: 1px solid #0f172a;
          padding: 9px 18px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
        }
        .portal-btn-outline {
          background: #ffffff;
          color: #0f172a;
          border: 1px solid #cbd5e1;
          padding: 8px 14px;
          border-radius: 4px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
        }
        @media (max-width: 768px) {
          .portal-container {
            padding: 24px 16px 60px;
          }
          .portal-header {
            padding: 14px 16px;
          }
          .portal-grid-2,
          .portal-grid-3 {
            grid-template-columns: 1fr;
          }
          .portal-card,
          .portal-summary-box {
            padding: 18px;
          }
        }
      `}</style>

      <header className="portal-header">
        <div className="portal-header-inner">
          <div>
            <Link href="/" style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.08em', color: '#0f172a', textDecoration: 'none' }}>
              KALARTI — PORTAL PRIVADO DE PERFIL
            </Link>
            <div style={{ fontSize: 12, color: '#64748b' }}>{user.email}</div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 3,
                border: '1px solid #cbd5e1',
                background: estadoVerif === 'VERIFICADO' ? '#f0fdf4' : '#f8fafc',
                color: estadoVerif === 'VERIFICADO' ? '#166534' : '#334155',
              }}
            >
              ESTADO: {estadoVerif === 'VERIFICADO' ? 'VERIFICADO' : 'EN REVISIÓN DOCUMENTAL'}
            </span>
            <Link href="/" className="portal-btn-outline">
              Inicio Web
            </Link>
            <button type="button" onClick={() => signOut()} className="portal-btn-outline">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="portal-container">
        {saveBanner && (
          <div style={{ padding: '12px 16px', border: '1px solid #16a34a', background: '#f0fdf4', color: '#166534', fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
            {saveBanner}
          </div>
        )}

        {/* CABECERA DE ESTADO */}
        <div className="portal-summary-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Expediente Unificado — Ley 1581 de 2012
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: '4px 0' }}>
                {form.nombres || user.email.split('@')[0]} {form.apellidos}
              </h1>
              <div style={{ fontSize: 13, color: '#475569' }}>
                {form.profesion || 'Profesional / Anunciante'} · {form.ciudad || 'Pasto'}, {form.pais || 'Colombia'}
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12.5 }}>
              <input
                type="checkbox"
                checked={form.disponible_red_talento}
                onChange={(e) => {
                  const val = e.target.checked;
                  setForm((prev) => ({ ...prev, disponible_red_talento: val }));
                  guardarFicha({ disponible_red_talento: val });
                }}
              />
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>
                  {form.disponible_red_talento ? 'Perfil Visible en Red de Talento' : 'Perfil Oculto en Red de Talento'}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  Habilita que constructoras del ERP consulten su perfil para obras.
                </div>
              </div>
            </label>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: '#475569' }}>
              <span>Nivel de completitud del expediente técnico</span>
              <strong>{progresoPerfil}%</strong>
            </div>
            <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${progresoPerfil}%`, height: '100%', background: '#0f172a' }} />
            </div>
          </div>
        </div>

        {/* NAVEGACIÓN DE SECCIONES (SIN ICONOS) */}
        <div className="portal-tabs">
          {[
            { id: 'perfil', label: '01. Perfil y Oficios' },
            { id: 'documentos', label: '02. Documentos y Soportes' },
            { id: 'cobertura', label: '03. Cobertura y Tarifas' },
            { id: 'convocatorias', label: `04. Convocatorias de Obra (${convocatorias.length})` },
            { id: 'postulaciones', label: `05. Mis Postulaciones (${postulaciones.length + asignacionesObra.length})` },
            { id: 'inmuebles', label: `06. Publicar Inmueble y CRM (${misInmuebles.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              className={`portal-tab-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* SECCIÓN 01: PERFIL Y OFICIOS */}
        {activeTab === 'perfil' && (
          <div className="portal-card">
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px 0' }}>
              01. Información Personal, Profesión y Especialidades de Obra
            </h2>

            <div className="portal-grid-2" style={{ marginBottom: 16 }}>
              <div>
                <label className="portal-label">Nombres</label>
                <input className="portal-input" value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} />
              </div>
              <div>
                <label className="portal-label">Apellidos</label>
                <input className="portal-input" value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} />
              </div>
              <div>
                <label className="portal-label">Tipo de Documento</label>
                <select className="portal-input" value={form.tipo_documento} onChange={(e) => setForm({ ...form, tipo_documento: e.target.value })}>
                  <option value="CC">Cédula de Ciudadanía (CC)</option>
                  <option value="NIT">NIT</option>
                  <option value="CE">Cédula de Extranjería (CE)</option>
                </select>
              </div>
              <div>
                <label className="portal-label">Número de Documento</label>
                <input className="portal-input" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} />
              </div>
              <div>
                <label className="portal-label">Teléfono / WhatsApp</label>
                <input className="portal-input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value, whatsapp: e.target.value })} />
              </div>
              <div>
                <label className="portal-label">Profesión u Oficio Principal</label>
                <input className="portal-input" value={form.profesion} onChange={(e) => setForm({ ...form, profesion: e.target.value })} />
              </div>
              <div>
                <label className="portal-label">Años de Experiencia</label>
                <input className="portal-input" type="number" min="0" value={form.anos_experiencia} onChange={(e) => setForm({ ...form, anos_experiencia: e.target.value })} />
              </div>
              <div>
                <label className="portal-label">Ciudad Base</label>
                <input className="portal-input" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label className="portal-label">Resumen de Experiencia Técnica y Obras Ejecutadas</label>
              <textarea
                rows={3}
                className="portal-input"
                value={form.resumen_experiencia}
                onChange={(e) => setForm({ ...form, resumen_experiencia: e.target.value })}
                placeholder="Describa su trayectoria técnica, tipos de proyectos ejecutados y certificaciones..."
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="portal-label">Cargos y Oficios en el Catálogo del ERP</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 12, border: '1px solid #cbd5e1', borderRadius: 4, maxHeight: 200, overflowY: 'auto' }}>
                {cargosCatalogo.map((c) => {
                  const sel = form.cargos_ids.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        const next = sel ? form.cargos_ids.filter((x) => x !== c.id) : [...form.cargos_ids, c.id];
                        setForm({ ...form, cargos_ids: next });
                      }}
                      style={{
                        fontSize: 12,
                        padding: '5px 10px',
                        borderRadius: 3,
                        cursor: 'pointer',
                        border: '1px solid #0f172a',
                        background: sel ? '#0f172a' : '#ffffff',
                        color: sel ? '#ffffff' : '#0f172a',
                        fontWeight: sel ? 700 : 500,
                      }}
                    >
                      {c.nombre}
                    </button>
                  );
                })}
              </div>
            </div>

            <button type="button" onClick={() => guardarFicha()} disabled={saving} className="portal-btn-dark">
              {saving ? 'Guardando...' : 'Guardar Perfil y Oficios'}
            </button>
          </div>
        )}

        {/* SECCIÓN 02: DOCUMENTOS Y SOPORTES */}
        {activeTab === 'documentos' && (
          <div className="portal-card">
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px 0' }}>
              02. Expediente Documental y Soportes de Ley
            </h2>
            <p style={{ fontSize: 13.5, color: '#475569', marginBottom: 20 }}>
              Cargue sus soportes en formato PDF o imagen para obtener el estado VERIFICADO en la Red de Talento.
            </p>

            <div className="portal-grid-2" style={{ marginBottom: 20 }}>
              <div>
                <label className="portal-label">Número Matrícula / Tarjeta Profesional (COPNIA / CONTE)</label>
                <input className="portal-input" value={form.tp_numero} onChange={(e) => setForm({ ...form, tp_numero: e.target.value })} placeholder="Opcional según oficio" />
              </div>
              <div>
                <label className="portal-label">Entidad ARL / Número de Póliza</label>
                <input className="portal-input" value={form.arl_numero} onChange={(e) => setForm({ ...form, arl_numero: e.target.value })} placeholder="Ej. Sura / Positiva" />
              </div>
            </div>

            <div className="portal-grid-3" style={{ marginBottom: 20 }}>
              {[
                { key: 'cedula_url', label: '01. Documento de Identidad / RUT', accept: 'image/*,application/pdf' },
                { key: 'hoja_vida_url', nameKey: 'hoja_vida_nombre', label: '02. Hoja de Vida Completa (PDF)', accept: 'application/pdf' },
                { key: 'tp_url', label: '03. Tarjeta Profesional (COPNIA/CONTE)', accept: 'image/*,application/pdf' },
                { key: 'arl_url', label: '04. Certificado Afiliación ARL Vigente', accept: 'image/*,application/pdf' },
                { key: 'portafolio_url', nameKey: 'portafolio_nombre', label: '05. Portafolio de Obras (PDF)', accept: 'application/pdf,image/*' },
                { key: 'diplomas_url', nameKey: 'diplomas_nombre', label: '06. Curso de Alturas SST y Diplomas', accept: 'application/pdf,image/*' },
              ].map((doc) => {
                const url = form[doc.key];
                const isUp = uploadingField === doc.key;
                return (
                  <div key={doc.key} style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{doc.label}</div>
                    <div style={{ fontSize: 12, color: url ? '#166534' : '#64748b', marginBottom: 12 }}>
                      {url ? 'Estado: Documento cargado' : 'Estado: Pendiente de carga'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <label className="portal-btn-outline" style={{ cursor: 'pointer' }}>
                        {isUp ? 'Subiendo...' : url ? 'Reemplazar archivo' : 'Subir archivo'}
                        <input type="file" hidden accept={doc.accept} onChange={(e) => handleUploadDocument(e, doc.key, doc.nameKey)} />
                      </label>
                      {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="portal-btn-outline">
                          Ver soporte
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button type="button" onClick={() => guardarFicha()} disabled={saving} className="portal-btn-dark">
              {saving ? 'Guardando...' : 'Guardar Datos Documentales'}
            </button>
          </div>
        )}

        {/* SECCIÓN 03: COBERTURA Y TARIFAS */}
        {activeTab === 'cobertura' && (
          <div className="portal-card">
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px 0' }}>
              03. Tarifas de Referencia y Municipios de Cobertura
            </h2>

            <div className="portal-grid-2" style={{ marginBottom: 20 }}>
              <div>
                <label className="portal-label">Tarifa de Referencia (COP)</label>
                <input
                  className="portal-input"
                  type="number"
                  min="0"
                  value={form.tarifa_referencia}
                  onChange={(e) => setForm({ ...form, tarifa_referencia: e.target.value })}
                  placeholder="Ej. 85000"
                />
              </div>
              <div>
                <label className="portal-label">Unidad de Cobro</label>
                <select className="portal-input" value={form.tarifa_unidad} onChange={(e) => setForm({ ...form, tarifa_unidad: e.target.value })}>
                  <option value="Día">Por Día (Jornal 8h)</option>
                  <option value="Mes">Por Mes</option>
                  <option value="Hora">Por Hora</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="portal-label">Municipios donde Puede Desplazarse a Trabajar</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {MUNICIPIOS_SUGERIDOS.map((mun) => {
                  const active = form.municipios_cobertura.includes(mun);
                  return (
                    <button
                      key={mun}
                      type="button"
                      onClick={() => {
                        const next = active
                          ? form.municipios_cobertura.filter((m) => m !== mun)
                          : [...form.municipios_cobertura, mun];
                        setForm({ ...form, municipios_cobertura: next });
                      }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 3,
                        fontSize: 12,
                        cursor: 'pointer',
                        border: '1px solid #0f172a',
                        background: active ? '#0f172a' : '#ffffff',
                        color: active ? '#ffffff' : '#0f172a',
                        fontWeight: active ? 700 : 500,
                      }}
                    >
                      {mun}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 8, maxWidth: 420 }}>
                <input
                  className="portal-input"
                  placeholder="Agregar otro municipio..."
                  value={nuevoMunicipio}
                  onChange={(e) => setNuevoMunicipio(e.target.value)}
                />
                <button
                  type="button"
                  className="portal-btn-outline"
                  onClick={() => {
                    const clean = nuevoMunicipio.trim();
                    if (clean && !form.municipios_cobertura.includes(clean)) {
                      setForm({ ...form, municipios_cobertura: [...form.municipios_cobertura, clean] });
                    }
                    setNuevoMunicipio('');
                  }}
                >
                  Agregar
                </button>
              </div>
            </div>

            <button type="button" onClick={() => guardarFicha()} disabled={saving} className="portal-btn-dark">
              {saving ? 'Guardando...' : 'Guardar Cobertura y Tarifas'}
            </button>
          </div>
        )}

        {/* SECCIÓN 04: CONVOCATORIAS DE OBRA */}
        {activeTab === 'convocatorias' && (
          <div className="portal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>04. Convocatorias y Licitaciones Abiertas</h2>
              <input
                className="portal-input"
                style={{ width: 240 }}
                placeholder="Filtrar por municipio..."
                value={filtroConvMunicipio}
                onChange={(e) => setFiltroConvMunicipio(e.target.value)}
              />
            </div>

            {convocatorias.length === 0 ? (
              <div style={{ padding: 24, border: '1px solid #e2e8f0', color: '#64748b', fontSize: 13.5 }}>
                No hay convocatorias abiertas en este momento. Mantenga su perfil activo en la Red de Talento para
                recibir invitaciones directas.
              </div>
            ) : (
              <div className="portal-grid-2">
                {convocatorias
                  .filter((c) => !filtroConvMunicipio || (c.municipio || '').toLowerCase().includes(filtroConvMunicipio.toLowerCase()))
                  .map((conv) => {
                    const yaPostulado = postuladosSet.has(conv.id);
                    return (
                      <div key={conv.id} style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                            {conv.municipio} — {conv.cargos?.nombre || 'Especialidad'}
                          </div>
                          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '4px 0' }}>{conv.titulo}</h3>
                          {conv.descripcion && <p style={{ fontSize: 13, color: '#334155', margin: '0 0 8px 0' }}>{conv.descripcion}</p>}
                          {conv.salario_rango && <div style={{ fontSize: 12.5, fontWeight: 700 }}>Rango: {conv.salario_rango}</div>}
                        </div>
                        <button
                          type="button"
                          disabled={yaPostulado}
                          onClick={() => postularseAConvocatoria(conv.id)}
                          className={yaPostulado ? 'portal-btn-outline' : 'portal-btn-dark'}
                        >
                          {yaPostulado ? 'Postulado' : 'Postularme en 1 Clic ➔'}
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN 05: MIS POSTULACIONES Y OBRAS */}
        {activeTab === 'postulaciones' && (
          <div className="portal-card">
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px 0' }}>05. Estado de Postulaciones y Obras Asignadas</h2>
            {postulaciones.length === 0 && asignacionesObra.length === 0 ? (
              <div style={{ padding: 20, border: '1px solid #e2e8f0', color: '#64748b', fontSize: 13.5 }}>
                Aún no registra postulaciones ni asignaciones activas en obra.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {postulaciones.map((p) => (
                  <div key={p.id} style={{ padding: 14, border: '1px solid #cbd5e1', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{p.convocatorias_ofertas?.titulo || 'Convocatoria'}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {p.convocatorias_ofertas?.municipio || 'Pasto'} · Postulado el {new Date(p.created_at).toLocaleDateString('es-CO')}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', border: '1px solid #0f172a', borderRadius: 3 }}>
                      {p.estado}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN 06: PUBLICAR INMUEBLE, CORREDORES Y CRM (PARTICULAR 3% / INMOBILIARIA 0.3%) */}
        {activeTab === 'inmuebles' && (
          <div className="portal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Módulo Inmobiliario con Aislamiento de Privacidad (Ley 1581)
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: '4px 0' }}>
                  06. Publicación de Inmuebles, Perfiles de Corredores y CRM de Prospectos
                </h2>
              </div>

              {/* SELECTOR DE MODALIDAD CONTRACTUAL */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setModalidadInm('PARTICULAR_3')}
                  className={`portal-tab-btn ${modalidadInm === 'PARTICULAR_3' ? 'active' : ''}`}
                >
                  Modalidad Particular (Comisión 3.0%)
                </button>
                <button
                  type="button"
                  onClick={() => setModalidadInm('INMOBILIARIA_03')}
                  className={`portal-tab-btn ${modalidadInm === 'INMOBILIARIA_03' ? 'active' : ''}`}
                >
                  Modalidad Inmobiliaria (Comisión 0.3%)
                </button>
              </div>
            </div>

            {/* RESUMEN CONTRACTUAL ACTIVO */}
            <div style={{ padding: 14, border: '1px solid #e2e8f0', background: '#f8fafc', marginBottom: 20, fontSize: 13, color: '#334155' }}>
              {modalidadInm === 'PARTICULAR_3' ? (
                <>
                  <strong>Régimen Activo — Propietario Particular (Comisión 3.0% sobre venta efectiva):</strong> Usted
                  registra su inmueble y KALARTI S.A.S. asesora, impulsa la comercialización mediante sus corredores y
                  realiza el seguimiento de prospectos. Sus datos personales de propietario permanecen bajo reserva.
                </>
              ) : (
                <>
                  <strong>Régimen Activo — Inmobiliaria / Agencia (Comisión 0.3% sobre venta efectiva):</strong> Su
                  inmobiliaria administra su cartera de inmuebles, gestiona su propio CRM de prospectos y crea múltiples
                  perfiles de corredores con aislamiento multi-tenant.
                </>
              )}
            </div>

            {/* SUB-PESTAÑAS INMOBILIARIAS */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => setInmSubTab('cartera')}
                className={`portal-btn-outline ${inmSubTab === 'cartera' ? 'portal-btn-dark' : ''}`}
              >
                Mis Inmuebles ({misInmuebles.length})
              </button>
              <button
                type="button"
                onClick={() => setInmSubTab('nuevo')}
                className={`portal-btn-outline ${inmSubTab === 'nuevo' ? 'portal-btn-dark' : ''}`}
              >
                + Publicar Nuevo Inmueble
              </button>
              {modalidadInm === 'INMOBILIARIA_03' && (
                <button
                  type="button"
                  onClick={() => setInmSubTab('corredores')}
                  className={`portal-btn-outline ${inmSubTab === 'corredores' ? 'portal-btn-dark' : ''}`}
                >
                  Perfiles de Corredores ({misCorredores.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => setInmSubTab('crm')}
                className={`portal-btn-outline ${inmSubTab === 'crm' ? 'portal-btn-dark' : ''}`}
              >
                Seguimiento de Prospectos CRM ({misLeadsInm.length})
              </button>
            </div>

            {/* SUBTAB 1: CARTERA DE INMUEBLES */}
            {inmSubTab === 'cartera' && (
              <div>
                {misInmuebles.length === 0 ? (
                  <div style={{ padding: 24, border: '1px solid #e2e8f0', fontSize: 13.5, color: '#475569' }}>
                    No tiene inmuebles registrados aún. Pulse en <strong>+ Publicar Nuevo Inmueble</strong> para
                    consignar su primera propiedad.
                  </div>
                ) : (
                  <div className="portal-grid-2">
                    {misInmuebles.map((inm) => (
                      <div key={inm.id} style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                          {inm.tipo} · {inm.ciudad} · {inm.estado || 'DISPONIBLE'}
                        </div>
                        <h3 style={{ fontSize: 15.5, fontWeight: 800, margin: '4px 0' }}>{inm.titulo}</h3>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(inm.precio || 0)}
                        </div>
                        <div style={{ fontSize: 12, color: '#475569' }}>
                          Comisión pactada: <strong>{inm.comision_plataforma_pct || inm.comision_pct || (modalidadInm === 'INMOBILIARIA_03' ? 0.3 : 3.0)}%</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB 2: PUBLICAR NUEVO INMUEBLE */}
            {inmSubTab === 'nuevo' && (
              <form onSubmit={handlePublicarInmueble}>
                <div className="portal-grid-2" style={{ marginBottom: 14 }}>
                  <div>
                    <label className="portal-label">Título Comercial del Inmueble *</label>
                    <input
                      className="portal-input"
                      required
                      value={inmForm.titulo}
                      onChange={(e) => setInmForm({ ...inmForm, titulo: e.target.value })}
                      placeholder="Ej. Apartamento 3 alcobas Sector Palermo / Lote Urbano"
                    />
                  </div>
                  <div>
                    <label className="portal-label">Precio de Venta (COP) *</label>
                    <input
                      className="portal-input"
                      type="number"
                      min="0"
                      required
                      value={inmForm.precio}
                      onChange={(e) => setInmForm({ ...inmForm, precio: e.target.value })}
                      placeholder="Ej. 380000000"
                    />
                  </div>
                </div>

                <div className="portal-grid-3" style={{ marginBottom: 14 }}>
                  <div>
                    <label className="portal-label">Tipo de Inmueble</label>
                    <select className="portal-input" value={inmForm.tipo} onChange={(e) => setInmForm({ ...inmForm, tipo: e.target.value })}>
                      <option value="Apartamento">Apartamento</option>
                      <option value="Casa">Casa</option>
                      <option value="Lote">Lote / Predio Urbano o Rural</option>
                      <option value="Local Comercial">Local Comercial / Bodega</option>
                    </select>
                  </div>
                  <div>
                    <label className="portal-label">Ciudad / Municipio *</label>
                    <input className="portal-input" required value={inmForm.ciudad} onChange={(e) => setInmForm({ ...inmForm, ciudad: e.target.value })} />
                  </div>
                  <div>
                    <label className="portal-label">Departamento</label>
                    <input className="portal-input" value={inmForm.departamento} onChange={(e) => setInmForm({ ...inmForm, departamento: e.target.value })} />
                  </div>
                </div>

                <div className="portal-grid-3" style={{ marginBottom: 14 }}>
                  <div>
                    <label className="portal-label">Área Terreno (m²)</label>
                    <input className="portal-input" type="number" min="0" value={inmForm.area_terreno} onChange={(e) => setInmForm({ ...inmForm, area_terreno: e.target.value })} />
                  </div>
                  <div>
                    <label className="portal-label">Área Construida (m²)</label>
                    <input className="portal-input" type="number" min="0" value={inmForm.area_construida} onChange={(e) => setInmForm({ ...inmForm, area_construida: e.target.value })} />
                  </div>
                  <div>
                    <label className="portal-label">Dirección / Sector</label>
                    <input className="portal-input" value={inmForm.direccion} onChange={(e) => setInmForm({ ...inmForm, direccion: e.target.value })} />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label className="portal-label">Descripción Técnica, Normativa y Comercial *</label>
                  <textarea
                    rows={3}
                    required
                    className="portal-input"
                    value={inmForm.descripcion}
                    onChange={(e) => setInmForm({ ...inmForm, descripcion: e.target.value })}
                    placeholder="Detalle distribución, acabados, servicios públicos y potencial de valorización..."
                  />
                </div>

                {/* DATOS PRIVADOS DEL PROPIETARIO (AISLADOS POR LEY 1581) */}
                <div style={{ padding: 16, border: '1px solid #cbd5e1', background: '#f8fafc', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: 10 }}>
                    Datos Reservados del Propietario (No visibles al público — Aislamiento Ley 1581)
                  </div>
                  <div className="portal-grid-3">
                    <div>
                      <label className="portal-label">Nombre del Propietario *</label>
                      <input className="portal-input" required value={inmForm.propietario_nombre} onChange={(e) => setInmForm({ ...inmForm, propietario_nombre: e.target.value })} />
                    </div>
                    <div>
                      <label className="portal-label">Teléfono Privado Propietario *</label>
                      <input className="portal-input" required value={inmForm.propietario_telefono} onChange={(e) => setInmForm({ ...inmForm, propietario_telefono: e.target.value })} />
                    </div>
                    <div>
                      <label className="portal-label">Matrícula Inmobiliaria (Opcional)</label>
                      <input className="portal-input" value={inmForm.matricula_inmobiliaria} onChange={(e) => setInmForm({ ...inmForm, matricula_inmobiliaria: e.target.value })} />
                    </div>
                  </div>

                  {modalidadInm === 'INMOBILIARIA_03' && misCorredores.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <label className="portal-label">Corredor Asignado de su Inmobiliaria</label>
                      <select className="portal-input" value={inmForm.corredor_id} onChange={(e) => setInmForm({ ...inmForm, corredor_id: e.target.value })}>
                        <option value="">-- Seleccionar corredor responsable --</option>
                        {misCorredores.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre} ({c.email || c.telefono || 'Corredor'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* CLÁUSULA CONTRACTUAL */}
                <div style={{ padding: 14, border: '1px solid #cbd5e1', marginBottom: 12, fontSize: 12.5 }}>
                  <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', marginBottom: 8 }}>
                    <input
                      type="checkbox"
                      checked={inmForm.acepta_contrato_comision}
                      onChange={(e) => setInmForm({ ...inmForm, acepta_contrato_comision: e.target.checked })}
                      style={{ marginTop: 3 }}
                    />
                    <span>
                      {modalidadInm === 'PARTICULAR_3' ? (
                        <>
                          <strong>Aceptación de Comisión por Venta del 3.0% (Particular):</strong> Autorizo a KALARTI
                          S.A.S. para asesorar, promocionar e impulsar la venta de este inmueble con sus corredores y
                          realizar el seguimiento de prospectos, reconociendo una comisión del <strong>3.0%</strong>{' '}
                          sobre el valor final en caso de venta efectiva.
                        </>
                      ) : (
                        <>
                          <strong>Aceptación de Comisión Tecnológica del 0.3% (Inmobiliaria):</strong> Declaro que
                          nuestra inmobiliaria cuenta con autorización del propietario para comercializar este predio y
                          reconoce a KALARTI S.A.S. una comisión del <strong>0.3%</strong> por venta cerrada en
                          plataforma.
                        </>
                      )}
                    </span>
                  </label>
                  <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={inmForm.acepta_habeas_data}
                      onChange={(e) => setInmForm({ ...inmForm, acepta_habeas_data: e.target.checked })}
                      style={{ marginTop: 3 }}
                    />
                    <span>
                      Acepto el tratamiento y aislamiento de datos personales conforme a la Ley 1581 de 2012 (Habeas
                      Data).
                    </span>
                  </label>
                </div>

                <button type="submit" disabled={saving} className="portal-btn-dark">
                  {saving ? 'Publicando...' : 'Publicar Inmueble ➔'}
                </button>
              </form>
            )}

            {/* SUBTAB 3: MÚLTIPLES PERFILES DE CORREDORES (SOLO INMOBILIARIAS 0.3%) */}
            {inmSubTab === 'corredores' && modalidadInm === 'INMOBILIARIA_03' && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 12px 0' }}>
                  Crear Perfil de Corredor Adscrito a su Inmobiliaria
                </h3>
                <form onSubmit={handleCrearCorredor} style={{ marginBottom: 24, padding: 16, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div className="portal-grid-3" style={{ marginBottom: 12 }}>
                    <div>
                      <label className="portal-label">Nombre Completo del Corredor *</label>
                      <input className="portal-input" required value={corredorForm.nombre} onChange={(e) => setCorredorForm({ ...corredorForm, nombre: e.target.value })} />
                    </div>
                    <div>
                      <label className="portal-label">Documento / Cédula</label>
                      <input className="portal-input" value={corredorForm.documento} onChange={(e) => setCorredorForm({ ...corredorForm, documento: e.target.value })} />
                    </div>
                    <div>
                      <label className="portal-label">Teléfono / WhatsApp Comercial *</label>
                      <input className="portal-input" required value={corredorForm.telefono} onChange={(e) => setCorredorForm({ ...corredorForm, telefono: e.target.value })} />
                    </div>
                  </div>
                  <div className="portal-grid-3" style={{ marginBottom: 12 }}>
                    <div>
                      <label className="portal-label">Correo Electrónico</label>
                      <input className="portal-input" type="email" value={corredorForm.email} onChange={(e) => setCorredorForm({ ...corredorForm, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="portal-label">Ciudad</label>
                      <input className="portal-input" value={corredorForm.ciudad} onChange={(e) => setCorredorForm({ ...corredorForm, ciudad: e.target.value })} />
                    </div>
                    <div>
                      <label className="portal-label">% Comisión Interna Agente</label>
                      <input className="portal-input" type="number" step="0.1" value={corredorForm.comision_interna_pct} onChange={(e) => setCorredorForm({ ...corredorForm, comision_interna_pct: e.target.value })} />
                    </div>
                  </div>
                  <button type="submit" disabled={saving} className="portal-btn-dark">
                    + Registrar Corredor
                  </button>
                </form>

                <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 10px 0' }}>
                  Corredores Registrados ({misCorredores.length})
                </h3>
                {misCorredores.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#64748b' }}>Aún no ha creado perfiles de corredores.</div>
                ) : (
                  <div className="portal-grid-2">
                    {misCorredores.map((c) => (
                      <div key={c.id} style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: 14 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{c.nombre}</div>
                        <div style={{ fontSize: 12, color: '#475569' }}>
                          {c.cargo} · {c.ciudad} · Comisión interna: {c.comision_interna_pct || 0}%
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                          {c.telefono} {c.email ? `· ${c.email}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB 4: CRM DE SEGUIMIENTO DE PROSPECTOS (LEADS) */}
            {inmSubTab === 'crm' && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 8px 0' }}>
                  CRM de Seguimiento de Prospectos ({misLeadsInm.length})
                </h3>
                <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
                  {modalidadInm === 'PARTICULAR_3'
                    ? 'Seguimiento de interesados gestionados por el equipo de corredores de KALARTI S.A.S. sobre sus inmuebles consignados.'
                    : 'Administre el estado de negociación y asigne corredores a cada prospecto recibido en su cartera.'}
                </p>

                {misLeadsInm.length === 0 ? (
                  <div style={{ padding: 20, border: '1px solid #e2e8f0', fontSize: 13, color: '#64748b' }}>
                    Aún no se registran prospectos para sus inmuebles publicados.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {misLeadsInm.map((ld) => (
                      <div key={ld.id} style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                            Inmueble: {ld.inmuebles?.titulo || 'Propiedad'}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>
                            {ld.nombre_interesado || 'Interesado'} — {ld.telefono || ld.email || 'Contacto reservado'}
                          </div>
                          {ld.mensaje && <div style={{ fontSize: 12.5, color: '#334155', marginTop: 4 }}>{ld.mensaje}</div>}
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          {modalidadInm === 'INMOBILIARIA_03' ? (
                            <>
                              <select
                                className="portal-input"
                                style={{ width: 'auto' }}
                                value={ld.etapa_crm || 'NUEVO'}
                                onChange={(e) => actualizarLeadCrm(ld.id, { etapa_crm: e.target.value })}
                              >
                                {ETAPAS_CRM.map((et) => (
                                  <option key={et} value={et}>
                                    {et}
                                  </option>
                                ))}
                              </select>
                              {misCorredores.length > 0 && (
                                <select
                                  className="portal-input"
                                  style={{ width: 'auto' }}
                                  value={ld.corredor_id || ''}
                                  onChange={(e) => actualizarLeadCrm(ld.id, { corredor_id: e.target.value || null })}
                                >
                                  <option value="">Sin corredor</option>
                                  {misCorredores.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.nombre}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </>
                          ) : (
                            <span style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 10px', border: '1px solid #0f172a', borderRadius: 3 }}>
                              Etapa: {ld.etapa_crm || 'EN GESTIÓN POR CORREDOR KALARTI'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function MiPortalPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, background: '#ffffff', color: '#0f172a' }}>Cargando portal...</div>}>
      <MiPortalInner />
    </Suspense>
  );
}
