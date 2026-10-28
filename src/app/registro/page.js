'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PLANES_CONSTRUCTORAS, MAPA_TIPO_PRODUCTO_MP, formatMoney } from '@/lib/planes';

const PERFILES_GATEWAY = [
  {
    id: 'profesional',
    icon: '👷',
    titulo: 'Profesional / Mano de Obra',
    subtitulo: 'Ingenieros, arquitectos, maestros, oficiales y cuadrillas',
    frase: 'Quiero postularme a proyectos, licitaciones y trabajar con constructoras',
    color: '#38bdf8',
    badge: '100% Gratis para el trabajador',
  },
  {
    id: 'constructor',
    icon: '🏗️',
    titulo: 'Constructor / Contratista',
    subtitulo: 'Constructoras, firmas de ingeniería e interventoría',
    frase: 'Quiero presupuestar, cotizar obras y administrar mis proyectos en el ERP',
    color: '#d4af37',
    badge: 'ERP 5D + Red de Talento',
  },
  {
    id: 'comercio',
    icon: '🏪',
    titulo: 'Comercio / Ferretería / Proveedor',
    subtitulo: 'Ferreterías con POS, depósitos y proveedores de insumos',
    frase: 'Quiero gestionar inventario, facturar con POS y vender insumos en el Marketplace',
    color: '#10b981',
    badge: 'POS + Marketplace B2B',
  },
  {
    id: 'cliente',
    icon: '🏢',
    titulo: 'Inversionista / Cliente Final',
    subtitulo: 'Propietarios de lote, remodelaciones e inversionistas',
    frase: 'Quiero cotizar mi obra o adquirir proyectos inmobiliarios',
    color: '#a855f7',
    badge: 'Cotizador NSR-10 Gratis',
  },
];

const MUNICIPIOS_SUGERIDOS = [
  'Pasto', 'Ipiales', 'Tumaco', 'Ricaurte', 'Túquerres', 'La Unión', 'Yacuanquer',
  'Cali', 'Popayán', 'Bogotá', 'Medellín', 'Pereira', 'Manizales', 'Armenia',
];

function RegistroInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();

  const tipoParam = (searchParams.get('tipo') || '').toLowerCase();
  const planParam = (searchParams.get('plan') || 'free').toLowerCase();

  const [selectedTipo, setSelectedTipo] = useState(
    ['profesional', 'constructor', 'comercio', 'proveedor', 'cliente'].includes(tipoParam)
      ? tipoParam
      : ''
  );

  useEffect(() => {
    if (['profesional', 'constructor', 'comercio', 'proveedor', 'cliente'].includes(tipoParam)) {
      setSelectedTipo(tipoParam);
    }
  }, [tipoParam]);

  // Catálogo dinámico de cargos del ERP
  const [cargos, setCargos] = useState([]);
  const [cargoQuery, setCargoQuery] = useState('');

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('cargos')
      .select('id, codigo, nombre, categoria, unidad')
      .order('nombre', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setCargos(data.filter((c) => (c.nombre || '').toLowerCase() !== 'cliente'));
        }
      });
  }, []);

  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    telefono: '',
    pais: 'Colombia',
    ciudad: 'Pasto',
    tipo_documento: 'CC',
    cedula: '',
    profesion: '',
    anos_experiencia: '3',
    tarifa_referencia: '',
    tarifa_unidad: 'Día',
    cargos_ids: [],
    municipios_cobertura: ['Pasto'],
    resumen_experiencia: '',
    empresa: '',
    nit: '',
    subtipo_comercio: tipoParam === 'proveedor' ? 'PROVEEDOR' : 'COMERCIO',
    plan: planParam || 'free',
    acepta_habeas_data: false,
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const filteredCargos = useMemo(() => {
    const q = cargoQuery.trim().toLowerCase();
    if (!q) return cargos;
    return cargos.filter(
      (c) =>
        (c.nombre || '').toLowerCase().includes(q) ||
        (c.codigo || '').toLowerCase().includes(q)
    );
  }, [cargos, cargoQuery]);

  const toggleCargo = (id) => {
    setForm((prev) => {
      const exists = prev.cargos_ids.includes(id);
      const next = exists
        ? prev.cargos_ids.filter((x) => x !== id)
        : [...prev.cargos_ids, id];
      return { ...prev, cargos_ids: next };
    });
  };

  const toggleMunicipio = (mun) => {
    setForm((prev) => {
      const exists = prev.municipios_cobertura.includes(mun);
      const next = exists
        ? prev.municipios_cobertura.filter((m) => m !== mun)
        : [...prev.municipios_cobertura, mun];
      return { ...prev, municipios_cobertura: next.length ? next : [prev.ciudad || 'Pasto'] };
    });
  };

  const handleSelectCard = (id) => {
    setSelectedTipo(id);
    if (id === 'proveedor') {
      setForm((f) => ({ ...f, subtipo_comercio: 'PROVEEDOR' }));
    }
    router.replace(`/registro?tipo=${id}`, { scroll: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.acepta_habeas_data) {
      setErrorMsg('Debes aceptar la política de tratamiento de datos personales (Ley 1581) para continuar.');
      return;
    }

    if (selectedTipo === 'profesional' && form.cargos_ids.length === 0 && !form.profesion.trim()) {
      setErrorMsg('Selecciona al menos un cargo/oficio o escribe tu profesión.');
      return;
    }

    setLoading(true);
    try {
      const effectiveTipo =
        selectedTipo === 'comercio' && form.subtipo_comercio === 'PROVEEDOR'
          ? 'PROVEEDOR'
          : selectedTipo === 'proveedor'
          ? 'PROVEEDOR'
          : selectedTipo.toUpperCase();

      const mappedRole =
        effectiveTipo === 'PROFESIONAL'
          ? 'PROFESIONAL'
          : effectiveTipo === 'CONSTRUCTOR'
          ? 'ADMIN'
          : effectiveTipo === 'COMERCIO' || effectiveTipo === 'PROVEEDOR'
          ? 'TIENDA'
          : 'CLIENTE';

      const selectedCargoNames = form.cargos_ids
        .map((cid) => cargos.find((c) => c.id === cid)?.nombre)
        .filter(Boolean)
        .join(' / ');

      const metadata = {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        whatsapp: form.telefono.trim(),
        pais: form.pais,
        ciudad: form.ciudad.trim() || 'Pasto',
        tipo_documento: form.tipo_documento,
        cedula: form.cedula.trim(),
        profesion: form.profesion.trim() || selectedCargoNames || effectiveTipo,
        cargos_ids: form.cargos_ids,
        tarifa_referencia: form.tarifa_referencia ? Number(form.tarifa_referencia) : null,
        tarifa_unidad: form.tarifa_unidad,
        municipios_cobertura: form.municipios_cobertura.length ? form.municipios_cobertura : [form.ciudad || 'Pasto'],
        anos_experiencia: Number(form.anos_experiencia) || 0,
        resumen_experiencia: form.resumen_experiencia.trim(),
        disponible_red_talento: effectiveTipo === 'PROFESIONAL',
        empresa: form.empresa.trim() || null,
        nit: form.nit.trim() || null,
        plan: form.plan || 'free',
        role: mappedRole,
        tipo_registro: effectiveTipo,
        acepta_habeas_data: true,
      };

      const { data, error } = await register(form.email.trim(), form.password, metadata);
      if (error) {
        setErrorMsg(error.message || 'No se pudo completar el registro.');
        setLoading(false);
        return;
      }

      // Si es constructor y eligió un plan de pago con Mercado Pago Checkout Pro
      if (effectiveTipo === 'CONSTRUCTOR' && ['mensual', 'semestral', 'anual'].includes(form.plan)) {
        try {
          const mpRes = await fetch('/api/pagos/mercadopago/preference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipoProducto: MAPA_TIPO_PRODUCTO_MP[form.plan] || 'PLAN_SUSCRIPCION_MENSUAL',
              referenciaId: `REG-${form.plan.toUpperCase()}-${Date.now()}`,
              userEmail: form.email.trim(),
              userId: data?.user?.id,
            }),
          });
          const mpData = await mpRes.json();
          if (mpData.init_point) {
            window.location.href = mpData.init_point;
            return;
          }
        } catch (mpErr) {
          console.warn('Redirección Mercado Pago omitida:', mpErr);
        }
      }

      if (effectiveTipo === 'PROFESIONAL') {
        router.push('/mi-portal');
      } else if (effectiveTipo === 'CLIENTE') {
        router.push('/cotizador');
      } else {
        router.push('/erp');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error inesperado durante el registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050b16', color: '#f8fafc', fontFamily: 'var(--font-inter), sans-serif', paddingBottom: 64 }}>
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1180, margin: '0 auto' }}>
        <Link href="/" style={{ color: '#f8fafc', textDecoration: 'none', fontWeight: 900, fontSize: 20 }}>
          KALARTI <span style={{ color: '#d4af37', fontSize: 12, fontWeight: 700 }}>ONBOARDING UNIFICADO</span>
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>¿Ya tienes cuenta?</span>
          <Link href="/erp" style={{ color: '#d4af37', textDecoration: 'none', fontWeight: 700, fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(212,175,55,0.35)' }}>
            Iniciar Sesión ➔
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 'clamp(24px, 3.6vw, 36px)', fontWeight: 900, margin: '0 0 8px' }}>
            ¿Cómo quieres participar en el Ecosistema Kalarti?
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
            Selecciona tu perfil para configurar tu cuenta y herramientas a la medida desde el primer minuto.
          </p>
        </div>

        {/* Gateway de 4 Tarjetas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(235px, 1fr))', gap: 16, marginBottom: 36 }}>
          {PERFILES_GATEWAY.map((card) => {
            const isSelected =
              selectedTipo === card.id || (card.id === 'comercio' && selectedTipo === 'proveedor');
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => handleSelectCard(card.id)}
                style={{
                  textAlign: 'left',
                  background: isSelected ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.78)',
                  border: isSelected ? `2px solid ${card.color}` : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14,
                  padding: 20,
                  color: '#f8fafc',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                  boxShadow: isSelected ? `0 8px 25px -6px ${card.color}40` : 'none',
                  transition: 'all 0.18s',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 30 }}>{card.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: `${card.color}22`, color: card.color }}>
                      {card.badge}
                    </span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{card.titulo}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{card.subtitulo}</div>
                  <p style={{ fontSize: 12, color: '#cbd5e1', margin: 0, lineHeight: 1.45, fontStyle: 'italic' }}>
                    &ldquo;{card.frase}&rdquo;
                  </p>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: card.color }}>
                  {isSelected ? '✓ Perfil seleccionado' : 'Elegir este perfil ➔'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Formulario Contextualizado */}
        {selectedTipo && (
          <form
            onSubmit={handleSubmit}
            style={{
              background: 'rgba(15, 23, 42, 0.92)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 16,
              padding: '28px 24px',
              maxWidth: 780,
              margin: '0 auto',
            }}
          >
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 14, marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: '#f8fafc' }}>
                {selectedTipo === 'profesional' && '👷 Registro en la Red de Profesionales y Cuadrillas'}
                {selectedTipo === 'constructor' && '🏗️ Registro de Constructora / Contratista (ERP 5D)'}
                {(selectedTipo === 'comercio' || selectedTipo === 'proveedor') && '🏪 Registro de Comercio, Ferretería o Proveedor'}
                {selectedTipo === 'cliente' && '🏢 Registro de Inversionista / Cliente Final'}
              </h2>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                Completa tus datos principales. Podrás adjuntar certificados y portafolio en el siguiente paso.
              </p>
            </div>

            {errorMsg && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Ing. Carlos Andrés Revelo"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0b1324', color: '#f8fafc', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0b1324', color: '#f8fafc', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>
                  Contraseña (mín. 6 caracteres) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0b1324', color: '#f8fafc', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>
                  Teléfono / WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="Ej: 300 123 4567"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0b1324', color: '#f8fafc', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>
                  Ciudad / Municipio Base *
                </label>
                <input
                  type="text"
                  required
                  value={form.ciudad}
                  onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                  placeholder="Ej: Pasto, Ipiales, Cali..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0b1324', color: '#f8fafc', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>
                  Documento / Cédula
                </label>
                <input
                  type="text"
                  value={form.cedula}
                  onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                  placeholder="Número de identificación"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0b1324', color: '#f8fafc', fontSize: 13 }}
                />
              </div>
            </div>

            {/* Campos específicos: PROFESIONAL */}
            {selectedTipo === 'profesional' && (
              <div style={{ background: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.22)', borderRadius: 12, padding: 18, marginBottom: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#38bdf8', marginBottom: 12 }}>
                  🛠️ Perfil Técnico, Oficios y Tarifas de Referencia
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 4 }}>
                      Profesión o Especialidad Principal
                    </label>
                    <input
                      type="text"
                      value={form.profesion}
                      onChange={(e) => setForm({ ...form, profesion: e.target.value })}
                      placeholder="Ej: Maestro de Obra / Ing. Civil / Oficial"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0b1324', color: '#f8fafc', fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 4 }}>
                      Tarifa de Referencia (COP)
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="number"
                        value={form.tarifa_referencia}
                        onChange={(e) => setForm({ ...form, tarifa_referencia: e.target.value })}
                        placeholder="Ej: 85000"
                        style={{ flex: 1, padding: '9px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0b1324', color: '#f8fafc', fontSize: 13 }}
                      />
                      <select
                        value={form.tarifa_unidad}
                        onChange={(e) => setForm({ ...form, tarifa_unidad: e.target.value })}
                        style={{ width: 85, padding: '9px 6px', borderRadius: 8, border: '1px solid #334155', background: '#0b1324', color: '#f8fafc', fontSize: 12 }}
                      >
                        <option value="Día">/ Día</option>
                        <option value="Mes">/ Mes</option>
                        <option value="Hora">/ Hora</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 4 }}>
                      Años de Experiencia
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={form.anos_experiencia}
                      onChange={(e) => setForm({ ...form, anos_experiencia: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0b1324', color: '#f8fafc', fontSize: 13 }}
                    />
                  </div>
                </div>

                {/* Selector Múltiple de Cargos / Oficios vinculado a la tabla cargos */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1' }}>
                      Cargos / Oficios que desempeñas en obra ({form.cargos_ids.length} seleccionados) *
                    </label>
                    <input
                      type="text"
                      value={cargoQuery}
                      onChange={(e) => setCargoQuery(e.target.value)}
                      placeholder="🔍 Filtrar cargos con escritura..."
                      style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0b1324', color: '#f8fafc', fontSize: 12, width: 220 }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      maxHeight: 150,
                      overflowY: 'auto',
                      padding: 10,
                      background: '#070d19',
                      borderRadius: 8,
                      border: '1px solid #1e293b',
                    }}
                  >
                    {filteredCargos.map((c) => {
                      const active = form.cargos_ids.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCargo(c.id)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: active ? '1px solid #38bdf8' : '1px solid #334155',
                            background: active ? 'rgba(56,189,248,0.22)' : 'rgba(15,23,42,0.8)',
                            color: active ? '#38bdf8' : '#cbd5e1',
                          }}
                        >
                          {active ? '✓ ' : '+ '}{c.nombre}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Municipios de cobertura */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>
                    📍 Municipios donde puedes trabajar o desplazar tu cuadrilla
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {MUNICIPIOS_SUGERIDOS.map((mun) => {
                      const active = form.municipios_cobertura.includes(mun);
                      return (
                        <button
                          key={mun}
                          type="button"
                          onClick={() => toggleMunicipio(mun)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: active ? '1px solid #10b981' : '1px solid #334155',
                            background: active ? 'rgba(16,185,129,0.2)' : 'transparent',
                            color: active ? '#34d399' : '#94a3b8',
                          }}
                        >
                          {active ? '✓ ' : ''}{mun}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Campos específicos: CONSTRUCTOR */}
            {selectedTipo === 'constructor' && (
              <div style={{ background: 'rgba(212, 175, 55, 0.06)', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: 12, padding: 18, marginBottom: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#d4af37', marginBottom: 12 }}>
                  🏗️ Datos de la Constructora / Contratista (Espacio Multi-Tenant Aislado)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 4 }}>
                      Razón Social o Nombre de tu Firma *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.empresa}
                      onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                      placeholder="Ej: Constructora Andina S.A.S."
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0b1324', color: '#f8fafc', fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 4 }}>
                      NIT / RUT
                    </label>
                    <input
                      type="text"
                      value={form.nit}
                      onChange={(e) => setForm({ ...form, nit: e.target.value })}
                      placeholder="Ej: 901.234.567-8"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0b1324', color: '#f8fafc', fontSize: 13 }}
                    />
                  </div>
                </div>

                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>
                  Plan de Suscripción (Pago único o recurrente vía Mercado Pago)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, plan: 'free' })}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      border: form.plan === 'free' ? '2px solid #d4af37' : '1px solid #334155',
                      background: form.plan === 'free' ? 'rgba(212,175,55,0.14)' : '#0b1324',
                      color: '#f8fafc',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 800 }}>Prueba Inicial</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>1 proyecto básico</div>
                  </button>
                  {PLANES_CONSTRUCTORAS.map((pl) => (
                    <button
                      key={pl.key}
                      type="button"
                      onClick={() => setForm({ ...form, plan: pl.key })}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        border: form.plan === pl.key ? '2px solid #d4af37' : '1px solid #334155',
                        background: form.plan === pl.key ? 'rgba(212,175,55,0.14)' : '#0b1324',
                        color: '#f8fafc',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800 }}>{pl.nombre}</div>
                      <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 700 }}>
                        {formatMoney(pl.precio.COP, 'COP')} {pl.periodo}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Campos específicos: COMERCIO / PROVEEDOR */}
            {(selectedTipo === 'comercio' || selectedTipo === 'proveedor') && (
              <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 12, padding: 18, marginBottom: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#10b981', marginBottom: 12 }}>
                  🏪 Configuración Comercial (POS & Marketplace Kalarti)
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, subtipo_comercio: 'COMERCIO' })}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: form.subtipo_comercio === 'COMERCIO' ? '2px solid #10b981' : '1px solid #334155',
                      background: form.subtipo_comercio === 'COMERCIO' ? 'rgba(16,185,129,0.15)' : '#0b1324',
                      color: '#f8fafc',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    🏪 Ferretería / Depósito (POS + Inventario + Marketplace)
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, subtipo_comercio: 'PROVEEDOR' })}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: form.subtipo_comercio === 'PROVEEDOR' ? '2px solid #f59e0b' : '1px solid #334155',
                      background: form.subtipo_comercio === 'PROVEEDOR' ? 'rgba(245,158,11,0.15)' : '#0b1324',
                      color: '#f8fafc',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    🏭 Proveedor / Fabricante (Catálogo B2B y Precios APU)
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 4 }}>
                      Nombre Comercial del Establecimiento *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.empresa}
                      onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                      placeholder="Ej: Ferretería El Constructor del Sur"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0b1324', color: '#f8fafc', fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 4 }}>
                      NIT / Cámara de Comercio
                    </label>
                    <input
                      type="text"
                      value={form.nit}
                      onChange={(e) => setForm({ ...form, nit: e.target.value })}
                      placeholder="Ej: 900.111.222-3"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0b1324', color: '#f8fafc', fontSize: 13 }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Consentimiento Ley 1581 Habeas Data */}
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: 12,
                color: '#cbd5e1',
                cursor: 'pointer',
                marginBottom: 20,
              }}
            >
              <input
                type="checkbox"
                checked={form.acepta_habeas_data}
                onChange={(e) => setForm({ ...form, acepta_habeas_data: e.target.checked })}
                style={{ marginTop: 3 }}
              />
              <span>
                Autorizo de manera libre y expresa el tratamiento de mis datos personales conforme a la{' '}
                <Link href="/privacidad" style={{ color: '#38bdf8' }}>
                  Ley 1581 de 2012 (Habeas Data)
                </Link>
                . Entiendo que en la Red de Talento mis datos de contacto y documentos sensibles permanecerán protegidos y solo se compartirán cuando me postule a una convocatoria o acepte una vinculación.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: '#d4af37',
                color: '#0f172a',
                fontWeight: 900,
                fontSize: 15,
                padding: '14px 20px',
                borderRadius: 10,
                border: 'none',
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading
                ? 'Creando tu cuenta en el Ecosistema Kalarti...'
                : selectedTipo === 'profesional'
                ? 'Crear mi Perfil Profesional e Ir a Mi Portal ➔'
                : selectedTipo === 'constructor' && form.plan !== 'free'
                ? 'Crear Cuenta y Continuar a Mercado Pago ➔'
                : 'Crear mi Cuenta Unificada ➔'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

export default function RegistroPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#050b16', color: '#f8fafc', padding: 48, textAlign: 'center' }}>Cargando portal de registro...</div>}>
      <RegistroInner />
    </Suspense>
  );
}
