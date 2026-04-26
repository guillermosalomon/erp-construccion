'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/store/StoreContext';
import { 
  proyectosService, 
  insumosService, 
  apuService, 
  apuDetalleService,
  presupuestoService,
  cargosService, 
  personalService,
  inventarioService,
  obraAvancesService,
  notesService,
  bimLinksService
} from '@/lib/services';
import { supabase } from '@/lib/supabase';

export default function Sidebar({ activeSection, onNavigate }) {
  const { user, isDemo, logout } = useAuth();
  const { state, dispatch, isOnline } = useStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Encontrar datos del trabajador para el usuario actual si existen
  const currentWorker = useMemo(() => {
    if (!user || !state.personal) return null;
    return state.personal.find(p => p.email?.toLowerCase() === user.email?.toLowerCase());
  }, [user, state.personal]);

  const handleNuclearReset = async () => {
    if (!confirm('⚠️ ¿ESTÁS SEGURO? Se borrará TODO el historial y cargará la nueva demo. No cierres la ventana.')) return;
    
    try {
      if (!user) return alert('Debes estar logueado.');
      const uid = user.id;

      alert('Iniciando limpieza total del sistema... Por favor espera.');
      
      // ORDEN DE ELIMINACIÓN PARA RESPETAR CLAVES FORÁNEAS (DE HIJOS A PADRES)
      
      // 1. Nivel 3 (Detalles y transacciones)
      const { data: inv } = await supabase.from('inventario_transacciones').select('id');
      const { data: ava } = await supabase.from('obra_avances').select('id');
      const { data: nts } = await supabase.from('item_notes').select('id');
      const { data: bim } = await supabase.from('bim_links').select('id');
      
      await Promise.all([
        ...(inv || []).map(x => inventarioService.remove(x.id)),
        ...(ava || []).map(x => obraAvancesService.remove(x.id)),
        ...(nts || []).map(x => notesService.remove(x.id)),
        ...(bim || []).map(x => bimLinksService.remove(x.id))
      ]);

      // 2. Nivel 2 (Items de presupuesto y detalles de APU)
      const { data: pre } = await supabase.from('presupuesto_items').select('id');
      const { data: det } = await supabase.from('apu_detalle').select('id');
      
      await Promise.all([
        ...(pre || []).map(x => presupuestoService.remove(x.id)),
        ...(det || []).map(x => apuDetalleService.remove(x.id))
      ]);

      // 3. Nivel 1 (Entidades base)
      const { data: pers } = await supabase.from('personal').select('id');
      const { data: apus } = await supabase.from('apu').select('id');
      const { data: insu } = await supabase.from('insumos').select('id');
      const { data: carg } = await supabase.from('cargos').select('id');
      
      await Promise.all([
        ...(pers || []).map(x => personalService.remove(x.id)),
        ...(apus || []).map(x => apuService.remove(x.id)),
        ...(insu || []).map(x => insumosService.remove(x.id)),
        ...(carg || []).map(x => cargosService.remove(x.id))
      ]);

      // 4. Raíz (Proyectos y Categorías)
      const { data: proy } = await supabase.from('proyectos').select('id');
      const { data: cate } = await supabase.from('categorias').select('id');
      
      await Promise.all([
        ...(proy || []).map(x => proyectosService.remove(x.id)),
        ...(cate || []).map(x => supabase.from('categorias').delete().eq('id', x.id))
      ]);
      
      alert('Sistema limpio. Cargando Nueva Demo Profesional...');

      // Inserción de Demo
      const { data: cargoO } = await supabase.from('cargos').insert({ nombre: 'Oficial Albañil', codigo: 'CAR-OFC', precio_unitario: 155000, unidad: 'Día', user_id: uid }).select().single();
      const { data: cargoA } = await supabase.from('cargos').insert({ nombre: 'Ayudante de Obra', codigo: 'CAR-AYU', precio_unitario: 105000, unidad: 'Día', user_id: uid }).select().single();
      
      const { data: insC } = await supabase.from('insumos').insert({ nombre: 'Cemento Gris (50kg)', codigo: 'I-CEM', tipo: 'MATERIAL', unidad: 'Bulto', precio_unitario: 35000, user_id: uid }).select().single();
      const { data: insA } = await supabase.from('insumos').insert({ nombre: 'Arena m3', codigo: 'I-ARE', tipo: 'MATERIAL', unidad: 'm3', precio_unitario: 75000, user_id: uid }).select().single();
      
      const { data: apuM } = await supabase.from('apu').insert({ nombre: 'Mortero Profesional (m3)', codigo: 'APU-B-MT', tipo: 'BASICO', unidad: 'm3', user_id: uid }).select().single();
      const { data: apuC } = await supabase.from('apu').insert({ nombre: 'Columna Concreto 30x30 ml', codigo: 'APU-C-COL', tipo: 'COMPUESTO', unidad: 'ml', user_id: uid }).select().single();
      
      const { data: proj } = await proyectosService.create({ nombre: 'DEMO PROFESIONAL: EDIFICIO PILOTO', codigo: 'DEMO-001', user_id: uid });
      
      // 1. Crear Item de Presupuesto (Asignado al usuario actual para que lo vea en el móvil)
      const { data: bItem } = await supabase.from('presupuesto_items').insert({
        proyecto_id: proj.id,
        apu_id: apuC.id,
        cantidad: 100,
        descripcion: 'Columnas Piso 1',
        capitulo: 'Estructura',
        fecha_inicio: new Date().toISOString().split('T')[0],
        asignado_a_cuadrilla: user?.email,
        user_id: uid
      }).select().single();

      // 2. Crear Personal vinculante
      await supabase.from('personal').insert({
        nombre: user?.user_metadata?.nombre || 'Arq. Guillermo Salomón',
        email: user?.email,
        cargo_id: cargoO?.id,
        user_id: uid
      });

      // 3. Crear Bodega y Stock Inicial
      const { data: bodega } = await supabase.from('bodegas').insert({
        proyecto_id: proj.id,
        nombre: 'Bodega Central - Edificio Piloto',
        user_id: uid
      }).select().single();

      if (bodega) {
        await supabase.from('inventario_transacciones').insert([
          { bodega_id: bodega.id, insumo_id: insC.id, tipo: 'ENTRADA', cantidad: 500, motivo: 'Carga inicial (Demo)', user_id: uid },
          { bodega_id: bodega.id, insumo_id: insA.id, tipo: 'ENTRADA', cantidad: 100, motivo: 'Carga inicial (Demo)', user_id: uid }
        ]);
      }
      
      alert('¡SISTEMA REINICIADO Y DEMO COMPLETA CARGADA! Refrescando...');
      window.location.reload();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const navItems = [
    {
      label: 'Principal',
      items: [
        { id: 'dashboard', name: 'Dashboard', icon: '📊' },
        { id: 'reportes', name: 'Reportes', icon: '📄' },
      ],
    },
    {
      label: 'Gestión APU',
      items: [
        { id: 'insumos', name: 'Insumos', icon: '📦' },
        { id: 'personal', name: 'Personal', icon: '👷' },
        { id: 'cargos', name: 'Cargos', icon: '👔' },
        { id: 'apu-basicos', name: 'APU Básicos', icon: '🧱' },
        { id: 'apu-compuestos', name: 'APU Compuestos', icon: '🏗️' },
      ],
    },
    {
      label: 'Logística',
      items: [
        { id: 'logistica', name: 'Bodega Móvil', icon: '🏬' },
      ],
    },
    {
      label: 'Proyectos',
      items: [
        { id: 'proyectos', name: 'Proyectos', icon: '📋' },
        { id: 'progreso', name: 'Seguimiento 5D', icon: '📉' },
      ],
    },
    {
      label: 'Finanzas',
      items: [
        { id: 'finanzas', name: 'Control Financiero', icon: '💰' },
        { id: 'nomina', name: 'Nómina', icon: '💵' },
      ],
    },
    {
      label: 'BIM',
      items: [
        { id: 'visor-3d', name: 'Visor 3D', icon: '🧊' },
        { id: 'bim-5d', name: 'Vinculación 5D', icon: '🔗' },
      ],
    },
  ];

  const userEmail = user?.email || '';
  const userInitial = userEmail.charAt(0).toUpperCase() || '?';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src="/kalarti-logo.png" alt="Kalarti" className="sidebar-logo" style={{ width: 36, height: 36, borderRadius: 10 }} />
        <div>
          <div className="sidebar-title">ERP Construcción</div>
          <div className="sidebar-subtitle">Gestión de Obra</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((section) => (
          <div key={section.label}>
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map((item) => (
              <button
                key={item.id}
                className={`sidebar-link ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => !item.disabled && onNavigate(item.id)}
                disabled={item.disabled}
                style={item.disabled ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                title={item.disabled ? 'Disponible en próximas fases' : item.name}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                <span>{item.name}</span>
                {item.disabled && <span className="sidebar-badge">Pronto</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* User section with Dropdown */}
      <div style={{
        padding: 'var(--space-sm) var(--space-md)',
        borderTop: '1px solid var(--color-border)',
        position: 'relative'
      }}>
        {showUserMenu && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: 12,
            right: 12,
            background: 'var(--color-bg)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
            marginBottom: 12,
            zIndex: 1000,
            padding: 6,
            border: '1px solid var(--color-border)',
            animation: 'slideUp 0.2s ease'
          }}>
            <button 
              onClick={() => {
                onNavigate('personal');
                setShowUserMenu(false);
                window.dispatchEvent(new CustomEvent('open-my-profile'));
              }}
              className="btn btn-ghost btn-sm" 
              style={{ width: '100%', justifyContent: 'flex-start', fontSize: 13, gap: 10, padding: '8px 12px' }}
            >
              ⚙️ Configuración de cuenta
            </button>
            <div style={{ height: 1, background: 'var(--color-border)', margin: '6px 0' }} />
            <button 
              onClick={logout}
              className="btn btn-ghost btn-sm" 
              style={{ width: '100%', justifyContent: 'flex-start', fontSize: 13, gap: 10, color: 'var(--color-danger)', padding: '8px 12px' }}
            >
              🚪 Cerrar sesión
            </button>
          </div>
        )}

        <div 
          onClick={() => setShowUserMenu(!showUserMenu)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: 'var(--space-sm)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            transition: 'background 0.2s',
            background: showUserMenu ? 'rgba(0,0,0,0.05)' : 'transparent'
          }}
        >
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: isDemo ? '#d97706' : '#2563eb',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
            overflow: 'hidden'
          }}>
            {currentWorker?.foto_url ? (
               <img src={currentWorker.foto_url} alt="P" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : userInitial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--color-text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {currentWorker ? `${currentWorker.nombres} ${currentWorker.apellidos}` : userEmail}
            </div>
            <div style={{
              fontSize: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: 'var(--color-text-tertiary)',
            }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isOnline ? '#16a34a' : '#d97706',
                display: 'inline-block',
              }} />
              {isOnline ? 'Online' : 'Offline'}
              {isDemo && ' · Demo'}
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', opacity: 0.5, transform: showUserMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            ▼
          </div>
        </div>
      </div>

      <div style={{
        padding: '6px var(--space-md) var(--space-sm)',
        fontSize: '11px',
        color: 'var(--color-text-tertiary)',
        textAlign: 'center',
      }}>
        Fase 11 — v0.11.0
      </div>
      <div className="sidebar-footer" style={{ padding: '0 16px 16px' }}>
        <button 
          onClick={handleNuclearReset}
          className="btn btn-primary" 
          style={{ width: '100%', background: '#ef4444', border: 'none', fontSize: 10, fontWeight: 800 }}
        >
          🔥 REINICIO Y DEMO
        </button>
      </div>
    </aside>
  );
}
