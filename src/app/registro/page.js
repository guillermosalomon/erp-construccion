'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { sincronizarIdentidad } from '@/lib/identidad';
import { PLANES_CONSTRUCTORAS, MAPA_TIPO_PRODUCTO_MP, formatMoney } from '@/lib/planes';

const PERFILES_GATEWAY = [
  {
    key: 'profesional',
    code: '01',
    titulo: 'Red de Talento (Profesional / Cuadrilla)',
    subtitulo: 'Postulación a proyectos, licitaciones y contratación directa con constructoras sin costo.',
    role: 'PROFESIONAL',
    tipo_registro: 'PROFESIONAL',
    condicion: 'Vinculación 100% Gratuita',
    detalleGeneral:
      'Orientado a ingenieros civiles, arquitectos, maestros de obra, oficiales y cuadrillas especializadas. Permite estructurar su hoja de vida técnica, cargar soportes de ley (COPNIA/CONTE, ARL, Curso de Alturas SST), activar disponibilidad por municipio y postularse en 1 clic a las vacantes publicadas por constructoras.',
    alcance: [
      'Visibilidad directa en el módulo de Equipo y Roles de las obras activas en el ERP.',
      'Insignia de Perfil Verificado tras validación documental sin costo de intermediación.',
      'Configuración de tarifas de referencia por jornal, día o mes y municipios de cobertura.',
      'Protección de datos personales conforme a la Ley 1581 de 2012 (Habeas Data).',
    ],
  },
  {
    key: 'constructor',
    code: '02',
    titulo: 'Constructor / Contratista (ERP 5D)',
    subtitulo: 'Presupuestos NSR-10, programación 4D/5D, compras, almacén y acceso a la Red de Talento.',
    role: 'ADMIN',
    tipo_registro: 'CONSTRUCTOR',
    condicion: 'Entorno Organizacional Aislado (Multi-Tenant)',
    detalleGeneral:
      'Diseñado para empresas constructoras, contratistas e interventorías que requieren presupuestar con más de 400 APUs calibrados, controlar programación 4D/5D, administrar compras y bodegas de obra, y vincular talento verificado o subcontratar cuadrillas.',
    alcance: [
      'Aislamiento total de información financiera, presupuestos y clientes por organización.',
      'Acceso directo al buscador B2B de la Red de Talento y publicación de vacantes de obra.',
      'Control de almacén, kardex de insumos, órdenes de compra y seguimiento físico-financiero.',
      'Intercambio y subcontratación de cuadrillas con capacidad ociosa entre fases de obra.',
    ],
  },
  {
    key: 'comercio',
    code: '03',
    titulo: 'Comercio / Proveedor de Insumos',
    subtitulo: 'Gestión de inventario, facturación POS, catálogo en Marketplace y conexión a APUs.',
    role: 'TIENDA',
    tipo_registro: 'COMERCIO',
    condicion: 'Modalidad POS Ferretero o Proveedor Mayorista B2B',
    detalleGeneral:
      'Dirigido a ferreterías, depósitos de materiales, fabricantes y distribuidores. Permite operar caja registradora POS en múltiples sucursales, controlar existencias en tiempo real, vender en el Marketplace B2B/B2C y sincronizar precios con los APUs regionales.',
    alcance: [
      'Facturación de mostrador POS, control de ingresos, traspasos entre sedes y devoluciones.',
      'Publicación automática de insumos con stock disponible en el Marketplace Kalarti.',
      'Vinculación de precios unitarios a los análisis de precios unitarios (APU) de la región.',
      'Administración de vendedores, supervisores de punto de venta y agenda comercial.',
    ],
  },
  {
    key: 'inmueble',
    code: '04',
    titulo: 'Publicar Inmueble (Particular 3% / Inmobiliaria 0.3%)',
    subtitulo: 'Consignación particular asistida por nuestros corredores (3%) o plataforma CRM multi-corredor para inmobiliarias (0.3%).',
    role: 'PROPIETARIO',
    tipo_registro: 'PROPIETARIO',
    condicion: 'Comisión al Éxito: Particular 3.0% | Inmobiliaria 0.3%',
    detalleGeneral:
      'Estructurado contractual y técnicamente en dos regímenes con aislamiento de privacidad: los propietarios particulares cuentan con asesoría e impulso comercial a cargo de los corredores de Kalarti (comisión 3%), mientras que las inmobiliarias administran su cartera, CRM de prospectos y múltiples perfiles de corredores (comisión 0.3%).',
    alcance: [
      'Propietario Particular (3.0%): Promoción activa con nuestros corredores, filtrado de leads y reserva absoluta de datos del propietario.',
      'Inmobiliarias (0.3%): Creación de múltiples perfiles de corredores propios y asignación por propiedad.',
      'Embudo CRM privado de prospectos (Nuevo, Contactado, Visita Programada, Propuesta, Cierre Ganado).',
      'Sincronización inmediata con el catálogo público de inmuebles y proyectos.',
    ],
  },
  {
    key: 'cliente',
    code: '05',
    titulo: 'Inversionista / Cliente de Obra',
    subtitulo: 'Cotización de obra nueva, remodelaciones o adquisición de proyectos inmobiliarios.',
    role: 'CLIENTE',
    tipo_registro: 'CLIENTE',
    condicion: 'Acceso Directo al Cotizador NSR-10 y Portafolio',
    detalleGeneral:
      'Pensado para propietarios de lotes, inversionistas y clientes finales que desean estimar el presupuesto técnico de su obra, estructurar su proyecto arquitectónico/estructural o invertir en bienes raíces desarrollados en el ecosistema.',
    alcance: [
      'Uso del Cotizador de Obra con memorias de cantidades y programación preliminar.',
      'Solicitud de diseño arquitectónico, modelado BIM 5D y construcción llave en mano.',
      'Historial privado de cotizaciones, presupuestos descargables y compras en Marketplace.',
      'Atención personalizada por el equipo de consultoría e ingeniería de KALARTI S.A.S.',
    ],
  },
];

const MUNICIPIOS_BASE = [
  'Pasto',
  'Ipiales',
  'Tumaco',
  'Túquerres',
  'La Unión',
  'Samaniego',
  'Sandoná',
  'Chachagüí',
  'Buesaco',
  'El Bordo',
  'Popayán',
  'Cali',
  'Medellín',
  'Bogotá',
];

function RegistroContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tipoParam = (searchParams.get('tipo') || '').toLowerCase();
  const subtipoParam = (searchParams.get('subtipo') || '').toLowerCase();
  const planParam = (searchParams.get('plan') || 'erp_pro_mensual').toLowerCase();
  const ofertaParam = searchParams.get('oferta') || '';

  const [selectedKey, setSelectedKey] = useState(() => {
    if (tipoParam === 'proveedor') return 'comercio';
    if (PERFILES_GATEWAY.some((p) => p.key === tipoParam)) return tipoParam;
    return 'profesional';
  });

  const [subtipoComercio, setSubtipoComercio] = useState(
    tipoParam === 'proveedor' ? 'PROVEEDOR' : 'COMERCIO'
  );
  const [subtipoInmueble, setSubtipoInmueble] = useState(
    subtipoParam === 'inmobiliaria' ? 'INMOBILIARIA' : 'PARTICULAR'
  );
  const [selectedPlan, setSelectedPlan] = useState(planParam);

  const [cargosCatalogo, setCargosCatalogo] = useState([]);
  const [selectedCargos, setSelectedCargos] = useState([]);

  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    telefono: '',
    pais: 'Colombia',
    ciudad: 'Pasto',
    documento: '',
    empresa: '',
    profesion: '',
    anos_experiencia: '',
    tarifa_referencia: '',
    tarifa_unidad: 'Día',
    acepta_habeas_data: false,
    acepta_contrato_comision: false,
  });

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (tipoParam === 'proveedor') {
      setSelectedKey('comercio');
      setSubtipoComercio('PROVEEDOR');
    } else if (PERFILES_GATEWAY.some((p) => p.key === tipoParam)) {
      setSelectedKey(tipoParam);
    }
    if (subtipoParam === 'inmobiliaria') {
      setSubtipoInmueble('INMOBILIARIA');
    } else if (subtipoParam === 'particular') {
      setSubtipoInmueble('PARTICULAR');
    }
  }, [tipoParam, subtipoParam]);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('cargos')
      .select('id, codigo, nombre, categoria, unidad')
      .order('nombre')
      .then(({ data }) => {
        if (Array.isArray(data)) setCargosCatalogo(data);
      });
  }, []);

  const toggleCargo = (id) => {
    setSelectedCargos((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const perfilActual = PERFILES_GATEWAY.find((p) => p.key === selectedKey) || PERFILES_GATEWAY[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!perfilActual) {
      setErrorMsg('Seleccione primero el tipo de perfil.');
      return;
    }
    if (!form.acepta_habeas_data) {
      setErrorMsg('Debe aceptar la Política de Tratamiento de Datos Personales (Ley 1581 de 2012) para continuar.');
      return;
    }
    if (selectedKey === 'inmueble' && !form.acepta_contrato_comision) {
      setErrorMsg(
        subtipoInmueble === 'INMOBILIARIA'
          ? 'Debe aceptar las condiciones contractuales de intermediación en plataforma (comisión del 0.3% sobre venta efectiva).'
          : 'Debe aceptar las condiciones de consignación y corretaje asistido por Kalarti (comisión del 3.0% sobre venta efectiva).'
      );
      return;
    }
    if (form.password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setBusy(true);
    try {
      const effectiveTipoRegistro =
        selectedKey === 'comercio'
          ? subtipoComercio
          : selectedKey === 'inmueble'
            ? subtipoInmueble === 'INMOBILIARIA'
              ? 'INMOBILIARIA'
              : 'PROPIETARIO'
            : perfilActual.tipo_registro;

      const effectiveRole =
        selectedKey === 'comercio'
          ? 'TIENDA'
          : selectedKey === 'inmueble'
            ? subtipoInmueble === 'INMOBILIARIA'
              ? 'INMOBILIARIA'
              : 'PROPIETARIO'
            : perfilActual.role;

      const metadata = {
        nombre: form.nombre.trim(),
        role: effectiveRole,
        tipo_registro: effectiveTipoRegistro,
        modalidad_inmueble: selectedKey === 'inmueble' ? subtipoInmueble : null,
        comision_pactada_pct:
          selectedKey === 'inmueble' ? (subtipoInmueble === 'INMOBILIARIA' ? 0.3 : 3.0) : null,
        telefono: form.telefono.trim(),
        whatsapp: form.telefono.trim(),
        pais: form.pais.trim() || 'Colombia',
        ciudad: form.ciudad.trim() || 'Pasto',
        cedula: form.documento.trim(),
        documento: form.documento.trim(),
        nit: form.documento.trim(),
        empresa: form.empresa.trim() || null,
        profesion: form.profesion.trim() || null,
        cargos_ids: selectedCargos,
        cargo_id: selectedCargos[0] || null,
        anos_experiencia: form.anos_experiencia ? Number(form.anos_experiencia) : 0,
        tarifa_referencia: form.tarifa_referencia ? Number(form.tarifa_referencia) : null,
        tarifa_unidad: form.tarifa_unidad || 'Día',
        municipios_cobertura: [form.ciudad.trim() || 'Pasto'],
        disponible_red_talento: selectedKey === 'profesional',
        acepta_habeas_data: true,
        acepta_contrato_comision: selectedKey === 'inmueble' ? true : false,
        plan: selectedKey === 'constructor' ? selectedPlan : 'free',
      };

      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: metadata },
      });

      if (signUpErr) throw signUpErr;

      const authUser = signUpData?.user;
      if (authUser) {
        await sincronizarIdentidad(authUser, metadata);

        if (selectedKey === 'profesional' && ofertaParam) {
          try {
            const { data: pers } = await supabase
              .from('personal')
              .select('id')
              .or(`profile_id.eq.${authUser.id},user_id.eq.${authUser.id}`)
              .limit(1)
              .maybeSingle();

            if (pers?.id) {
              await supabase.from('postulaciones_profesionales').insert({
                oferta_id: ofertaParam,
                personal_id: pers.id,
                user_id: authUser.id,
                estado: 'POSTULADO',
              });
            }
          } catch {
            // Postulación opcional
          }
        }
      }

      if (selectedKey === 'constructor' && selectedPlan !== 'cotizador_free') {
        const tipoProductoMp = MAPA_TIPO_PRODUCTO_MP[selectedPlan];
        if (tipoProductoMp) {
          try {
            const resp = await fetch('/api/pagos/mercadopago/preference', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tipo_producto: tipoProductoMp,
                user_id: authUser?.id || null,
                email: form.email.trim(),
                nombre: form.nombre.trim(),
                telefono: form.telefono.trim(),
              }),
            });
            const mpData = await resp.json();
            if (mpData?.init_point) {
              window.location.href = mpData.init_point;
              return;
            }
          } catch (mpErr) {
            console.warn('Error iniciando checkout Mercado Pago:', mpErr);
          }
        }
      }

      if (!signUpData?.session) {
        setSuccessMsg(
          'Cuenta creada correctamente. Revise su correo electrónico para confirmar la cuenta e iniciar sesión.'
        );
        return;
      }

      if (selectedKey === 'profesional') {
        router.push('/mi-portal?onboarding=1');
      } else if (selectedKey === 'inmueble') {
        router.push('/mi-portal?tab=inmuebles');
      } else if (selectedKey === 'cliente') {
        router.push('/cotizador');
      } else {
        router.push('/erp');
      }
    } catch (err) {
      setErrorMsg(err?.message || 'No fue posible completar el registro.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="manual-reg-page">
      <style>{`
        .manual-reg-page {
          min-height: 100vh;
          background: #ffffff;
          color: #0f172a;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          line-height: 1.6;
        }
        .manual-reg-nav {
          border-bottom: 1px solid #e2e8f0;
          padding: 16px 28px;
          background: #ffffff;
        }
        .manual-reg-nav-inner {
          max-width: 1180px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .manual-reg-container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 36px 28px 80px;
        }
        /* PASO 1 EN 2 COLUMNAS: Izquierda lista con check y recuadro verde / Derecha información general */
        .step1-two-cols {
          display: grid;
          grid-template-columns: 0.95fr 1.25fr;
          gap: 28px;
          align-items: stretch;
          margin-bottom: 36px;
        }
        .profile-checklist {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .profile-check-item {
          width: 100%;
          text-align: left;
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          border-radius: 6px;
          padding: 14px 16px;
          cursor: pointer;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          transition: all 0.16s ease;
        }
        .profile-check-item:hover {
          border-color: #64748b;
        }
        .profile-check-item.selected {
          border: 2px solid #16a34a;
          background: #f0fdf4;
          box-shadow: 0 2px 10px rgba(22, 163, 74, 0.08);
        }
        .profile-check-box {
          width: 22px;
          height: 22px;
          min-width: 22px;
          border-radius: 4px;
          border: 2px solid #94a3b8;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
          font-size: 13px;
          font-weight: 900;
          color: transparent;
          transition: all 0.15s ease;
        }
        .profile-check-item.selected .profile-check-box {
          background: #16a34a;
          border-color: #16a34a;
          color: #ffffff;
        }
        .step1-info-panel {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 28px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .manual-reg-form-box {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 32px;
          background: #ffffff;
        }
        .manual-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          background: #ffffff;
          color: #0f172a;
          font-size: 14px;
          box-sizing: border-box;
        }
        .manual-input:focus {
          outline: none;
          border-color: #0f172a;
        }
        .manual-label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: #334155;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .manual-row-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }
        .manual-row-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }
        @media (max-width: 900px) {
          .step1-two-cols {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .manual-reg-container {
            padding: 24px 18px 60px;
          }
          .manual-reg-form-box,
          .step1-info-panel {
            padding: 20px;
          }
          .manual-row-2,
          .manual-row-3 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="manual-reg-nav">
        <div className="manual-reg-nav-inner">
          <Link href="/" style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.08em', color: '#0f172a', textDecoration: 'none' }}>
            KALARTI — REGISTRO UNIFICADO
          </Link>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', fontSize: 13 }}>
            <Link href="/erp" style={{ color: '#0f172a', fontWeight: 600, textDecoration: 'underline' }}>
              Ya tengo cuenta — Iniciar Sesión
            </Link>
          </div>
        </div>
      </header>

      <main className="manual-reg-container">
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b', marginBottom: 6 }}>
            Paso 01 — Selección de Perfil en el Ecosistema
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 800, margin: 0 }}>
            Seleccione su perfil a la izquierda y revise el alcance a la derecha
          </h1>
        </div>

        {/* PASO 1 EN 2 COLUMNAS: IZQUIERDA CASILLAS EN LISTA CON CHECK Y RECUADRO VERDE / DERECHA INFORMACIÓN GENERAL */}
        <div className="step1-two-cols">
          {/* COLUMNA IZQUIERDA: LISTA CON CHECK Y RECUADRO EN VERDE */}
          <div className="profile-checklist">
            {PERFILES_GATEWAY.map((p) => {
              const active = selectedKey === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  className={`profile-check-item ${active ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedKey(p.key);
                    setErrorMsg('');
                  }}
                >
                  <span className="profile-check-box" aria-hidden="true">
                    ✓
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: active ? '#15803d' : '#64748b' }}>
                        Perfil {p.code} {active ? '· Seleccionado' : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a', marginBottom: 3 }}>
                      {p.titulo}
                    </div>
                    <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.45 }}>
                      {p.subtitulo}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* COLUMNA DERECHA: INFORMACIÓN GENERAL Y ALCANCE DEL PERFIL SELECCIONADO */}
          <div className="step1-info-panel">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingBottom: 14, marginBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#15803d' }}>
                  Información General — Perfil {perfilActual.code}
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 4, background: '#f0fdf4', color: '#166534', border: '1px solid #86efac' }}>
                  {perfilActual.condicion}
                </span>
              </div>

              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
                {perfilActual.titulo}
              </h2>
              <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.65, margin: '0 0 18px 0' }}>
                {perfilActual.detalleGeneral}
              </p>

              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0f172a', marginBottom: 10 }}>
                Funciones y Condiciones Habilitadas:
              </div>
              <ul style={{ margin: '0 0 20px 0', paddingLeft: 18, fontSize: 13.5, color: '#334155', lineHeight: 1.6 }}>
                {(perfilActual.alcance || []).map((item) => (
                  <li key={item} style={{ marginBottom: 8 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ paddingTop: 14, borderTop: '1px solid #e2e8f0', fontSize: 12.5, color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <span>Identidad única sincronizada con el ecosistema web y ERP bajo Ley 1581 de 2012.</span>
              <a href="#formulario-paso-2" style={{ color: '#15803d', fontWeight: 700, textDecoration: 'none' }}>
                Continuar al Paso 02 ↓
              </a>
            </div>
          </div>
        </div>

        {/* PASO 2: FORMULARIO CONTEXTUALIZADO */}
        {perfilActual && (
          <div id="formulario-paso-2" className="manual-reg-form-box">
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 16, marginBottom: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Paso 02 — Formulario de Afiliación ({perfilActual.titulo})
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '4px 0 4px 0' }}>
                Complete los datos del titular o representante
              </h2>
              <p style={{ fontSize: 13.5, color: '#475569', margin: 0 }}>
                {perfilActual.subtitulo}
              </p>
            </div>

            {errorMsg && (
              <div style={{ padding: '12px 14px', border: '1px solid #dc2626', background: '#fef2f2', color: '#991b1b', fontSize: 13, marginBottom: 18 }}>
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div style={{ padding: '14px 16px', border: '1px solid #16a34a', background: '#f0fdf4', color: '#166534', fontSize: 13.5, marginBottom: 18 }}>
                {successMsg}
                <div style={{ marginTop: 10 }}>
                  <Link href="/erp" style={{ color: '#166534', fontWeight: 700, textDecoration: 'underline' }}>
                    Ir a Iniciar Sesión ➔
                  </Link>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* SUBMODALIDAD COMERCIO VS PROVEEDOR */}
              {selectedKey === 'comercio' && (
                <div style={{ marginBottom: 20, padding: 16, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <label className="manual-label">Modalidad Comercial</label>
                  <div className="manual-row-2" style={{ marginBottom: 0 }}>
                    <button
                      type="button"
                      onClick={() => setSubtipoComercio('COMERCIO')}
                      style={{
                        padding: 12,
                        textAlign: 'left',
                        background: subtipoComercio === 'COMERCIO' ? '#f0fdf4' : '#ffffff',
                        color: '#0f172a',
                        border: subtipoComercio === 'COMERCIO' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        {subtipoComercio === 'COMERCIO' ? '✓ ' : ''}Ferretería / Depósito con POS
                      </div>
                      <div style={{ fontSize: 11.5, color: '#475569' }}>
                        Caja registradora POS, inventario multi-sede y tienda en Marketplace.
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubtipoComercio('PROVEEDOR')}
                      style={{
                        padding: 12,
                        textAlign: 'left',
                        background: subtipoComercio === 'PROVEEDOR' ? '#f0fdf4' : '#ffffff',
                        color: '#0f172a',
                        border: subtipoComercio === 'PROVEEDOR' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        {subtipoComercio === 'PROVEEDOR' ? '✓ ' : ''}Proveedor / Fabricante B2B
                      </div>
                      <div style={{ fontSize: 11.5, color: '#475569' }}>
                        Catálogo mayorista e integración de precios en APUs regionales.
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* SUBMODALIDAD INMUEBLE: PARTICULAR (3%) VS INMOBILIARIA (0.3%) */}
              {selectedKey === 'inmueble' && (
                <div style={{ marginBottom: 20, padding: 16, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <label className="manual-label">Modalidad Contractual de Publicación Inmobiliaria</label>
                  <div className="manual-row-2" style={{ marginBottom: 0 }}>
                    <button
                      type="button"
                      onClick={() => setSubtipoInmueble('PARTICULAR')}
                      style={{
                        padding: 14,
                        textAlign: 'left',
                        background: subtipoInmueble === 'PARTICULAR' ? '#f0fdf4' : '#ffffff',
                        color: '#0f172a',
                        border: subtipoInmueble === 'PARTICULAR' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 4 }}>
                        {subtipoInmueble === 'PARTICULAR' ? '✓ ' : ''}Propietario Particular — Comisión 3.0%
                      </div>
                      <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.45 }}>
                        Kalarti asesora, impulsa la venta con sus propios corredores y realiza el seguimiento de leads.
                        Privacidad total de los datos del propietario.
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubtipoInmueble('INMOBILIARIA')}
                      style={{
                        padding: 14,
                        textAlign: 'left',
                        background: subtipoInmueble === 'INMOBILIARIA' ? '#f0fdf4' : '#ffffff',
                        color: '#0f172a',
                        border: subtipoInmueble === 'INMOBILIARIA' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 4 }}>
                        {subtipoInmueble === 'INMOBILIARIA' ? '✓ ' : ''}Inmobiliaria / Agencia — Comisión 0.3%
                      </div>
                      <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.45 }}>
                        Administración aislada de cartera de inmuebles, CRM propio para seguimiento de prospectos y
                        creación de múltiples perfiles de corredores.
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* PLANES CONSTRUCTOR */}
              {selectedKey === 'constructor' && (
                <div style={{ marginBottom: 20, padding: 16, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <label className="manual-label">Plan de Suscripción</label>
                  <div className="manual-row-2" style={{ marginBottom: 0 }}>
                    {PLANES_CONSTRUCTORAS.map((pl) => (
                      <button
                        key={pl.id}
                        type="button"
                        onClick={() => setSelectedPlan(pl.id)}
                        style={{
                          padding: 12,
                          textAlign: 'left',
                          background: selectedPlan === pl.id ? '#f0fdf4' : '#ffffff',
                          color: '#0f172a',
                          border: selectedPlan === pl.id ? '2px solid #16a34a' : '1px solid #cbd5e1',
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 13 }}>
                          {selectedPlan === pl.id ? '✓ ' : ''}
                          {pl.nombre}
                        </div>
                        <div style={{ fontSize: 12, color: '#475569' }}>
                          {pl.precio === 0 ? 'Sin costo' : `${formatMoney(pl.precio)} / ${pl.periodo}`}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="manual-row-2">
                <div>
                  <label className="manual-label">Nombres y Apellidos *</label>
                  <input
                    className="manual-input"
                    required
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Nombre completo del titular o representante"
                  />
                </div>
                <div>
                  <label className="manual-label">Cédula o NIT *</label>
                  <input
                    className="manual-input"
                    required
                    value={form.documento}
                    onChange={(e) => setForm({ ...form, documento: e.target.value })}
                    placeholder="Número de identificación tributaria o personal"
                  />
                </div>
              </div>

              {(selectedKey === 'constructor' ||
                selectedKey === 'comercio' ||
                (selectedKey === 'inmueble' && subtipoInmueble === 'INMOBILIARIA')) && (
                <div style={{ marginBottom: 16 }}>
                  <label className="manual-label">Razón Social / Nombre de la Empresa o Inmobiliaria *</label>
                  <input
                    className="manual-input"
                    required
                    value={form.empresa}
                    onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                    placeholder="Razón social o nombre comercial"
                  />
                </div>
              )}

              <div className="manual-row-2">
                <div>
                  <label className="manual-label">Correo Electrónico *</label>
                  <input
                    className="manual-input"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="correo@dominio.com"
                  />
                </div>
                <div>
                  <label className="manual-label">Contraseña de Acceso *</label>
                  <input
                    className="manual-input"
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              </div>

              <div className="manual-row-3">
                <div>
                  <label className="manual-label">Teléfono / WhatsApp *</label>
                  <input
                    className="manual-input"
                    required
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    placeholder="+57 300 000 0000"
                  />
                </div>
                <div>
                  <label className="manual-label">País</label>
                  <input
                    className="manual-input"
                    value={form.pais}
                    onChange={(e) => setForm({ ...form, pais: e.target.value })}
                  />
                </div>
                <div>
                  <label className="manual-label">Ciudad / Municipio *</label>
                  <input
                    className="manual-input"
                    list="municipios-list"
                    required
                    value={form.ciudad}
                    onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                  />
                  <datalist id="municipios-list">
                    {MUNICIPIOS_BASE.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* CAMPOS ESPECÍFICOS PROFESIONAL */}
              {selectedKey === 'profesional' && (
                <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid #e2e8f0' }}>
                  <div className="manual-row-3">
                    <div>
                      <label className="manual-label">Profesión u Oficio Principal *</label>
                      <input
                        className="manual-input"
                        required
                        value={form.profesion}
                        onChange={(e) => setForm({ ...form, profesion: e.target.value })}
                        placeholder="Ej. Ingeniero Civil, Maestro de Obra..."
                      />
                    </div>
                    <div>
                      <label className="manual-label">Años de Experiencia</label>
                      <input
                        className="manual-input"
                        type="number"
                        min="0"
                        value={form.anos_experiencia}
                        onChange={(e) => setForm({ ...form, anos_experiencia: e.target.value })}
                        placeholder="Ej. 5"
                      />
                    </div>
                    <div>
                      <label className="manual-label">Tarifa de Referencia (COP / Día)</label>
                      <input
                        className="manual-input"
                        type="number"
                        min="0"
                        value={form.tarifa_referencia}
                        onChange={(e) => setForm({ ...form, tarifa_referencia: e.target.value })}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>

                  {cargosCatalogo.length > 0 && (
                    <div style={{ marginBottom: 18 }}>
                      <label className="manual-label">
                        Cargos y Especialidades en Obra (seleccione uno o varios)
                      </label>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                          maxHeight: 165,
                          overflowY: 'auto',
                          padding: 10,
                          border: '1px solid #cbd5e1',
                          borderRadius: 4,
                        }}
                      >
                        {cargosCatalogo.map((c) => {
                          const sel = selectedCargos.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => toggleCargo(c.id)}
                              style={{
                                fontSize: 12,
                                padding: '5px 10px',
                                borderRadius: 3,
                                cursor: 'pointer',
                                border: sel ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                                background: sel ? '#f0fdf4' : '#ffffff',
                                color: sel ? '#166534' : '#0f172a',
                                fontWeight: sel ? 700 : 500,
                              }}
                            >
                              {sel ? '✓ ' : ''}
                              {c.nombre}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ACEPTACIÓN CONTRACTUAL INMUEBLES */}
              {selectedKey === 'inmueble' && (
                <div style={{ marginTop: 14, padding: 14, border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: 12.5, color: '#334155' }}>
                  <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.acepta_contrato_comision}
                      onChange={(e) => setForm({ ...form, acepta_contrato_comision: e.target.checked })}
                      style={{ marginTop: 3 }}
                    />
                    <span>
                      {subtipoInmueble === 'INMOBILIARIA' ? (
                        <>
                          <strong>Acuerdo de Afiliación para Inmobiliarias (Comisión 0.3%):</strong> Acepto que nuestra
                          agencia administrará sus inmuebles, su CRM de prospectos y sus perfiles de corredores de
                          manera aislada, reconociendo a KALARTI S.A.S. una comisión tecnológica del{' '}
                          <strong>0.3%</strong> únicamente sobre las ventas efectivamente cerradas a través de la
                          plataforma.
                        </>
                      ) : (
                        <>
                          <strong>Mandato de Corretaje para Propietario Particular (Comisión 3.0%):</strong> Autorizo a
                          KALARTI S.A.S. para asesorar, promocionar e impulsar la venta de mi inmueble mediante sus
                          corredores y realizar el seguimiento de leads, reconociendo una comisión del{' '}
                          <strong>3.0%</strong> sobre el valor de venta efectiva al cierre del negocio. Mis datos
                          personales de contacto se mantendrán bajo reserva frente al público general.
                        </>
                      )}
                    </span>
                  </label>
                </div>
              )}

              {/* HABEAS DATA LEY 1581 */}
              <div style={{ marginTop: 14, padding: 14, border: '1px solid #e2e8f0', fontSize: 12.5, color: '#334155' }}>
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.acepta_habeas_data}
                    onChange={(e) => setForm({ ...form, acepta_habeas_data: e.target.checked })}
                    style={{ marginTop: 3 }}
                  />
                  <span>
                    Autorizo de manera libre, previa, expresa e informada a <strong>KALARTI S.A.S.</strong> para el
                    tratamiento de mis datos personales y técnicos conforme a la{' '}
                    <Link href="/privacidad" target="_blank" style={{ color: '#0f172a', fontWeight: 700 }}>
                      Política de Privacidad y Tratamiento de Datos — Ley 1581 de 2012 (Habeas Data)
                    </Link>
                    .
                  </span>
                </label>
              </div>

              <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={busy}
                  style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: 4,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: busy ? 'wait' : 'pointer',
                  }}
                >
                  {busy ? 'Procesando registro...' : 'Crear Cuenta y Continuar ➔'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default function RegistroPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, background: '#ffffff', color: '#0f172a' }}>Cargando formulario...</div>}>
      <RegistroContent />
    </Suspense>
  );
}
