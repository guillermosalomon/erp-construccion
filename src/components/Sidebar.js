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
  const { clearDatabase, state, dispatch, isOnline } = useStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Encontrar datos del trabajador para el usuario actual si existen
  const currentWorker = useMemo(() => {
    if (!user || !state.personal) return null;
    return state.personal.find(p => p.email?.toLowerCase() === user.email?.toLowerCase());
  }, [user, state.personal]);

  const handleNuclearReset = async () => {
    if (!confirm('⚠️ ¿ESTÁS SEGURO? Se borrarán TODOS los datos permanentemente.')) return;
    
    try {
      if (!user) return alert('Debes estar logueado.');

      alert('Iniciando limpieza total del sistema... Por favor espera.');
      
      await clearDatabase();
      
      alert('¡SISTEMA REINICIADO! La base de datos está vacía.');
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
        Fase 12 — v0.12.0
      </div>
      <div className="sidebar-footer" style={{ padding: '0 16px 16px' }}>
        <button 
          onClick={handleNuclearReset}
          className="btn btn-primary" 
          style={{ width: '100%', background: '#ef4444', border: 'none', fontSize: 10, fontWeight: 800 }}
        >
          🔄 REINICIAR SISTEMA
        </button>
      </div>
    </aside>
  );
}
