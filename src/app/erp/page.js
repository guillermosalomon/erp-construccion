'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/store/StoreContext';
import LoginView from '@/components/LoginView';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import InsumosView from '@/components/InsumosView';
import APUView from '@/components/APUView';
import ProyectosView from '@/components/ProyectosView';
import PresupuestoView from '@/components/PresupuestoView';
import BIM5DView from '@/components/BIM5DView';
import ReportsView from '@/components/ReportsView';
import ProgressView from '@/components/ProgressView';
import LogisticsView from '@/components/LogisticsView';
import FinanceView from '@/components/FinanceView';
import ProjectHubView from '@/components/ProjectHubView';
import CuadrillaPortalView from '@/components/CuadrillaPortalView';
import NominaView from '@/components/NominaView';
import PersonalView from '@/components/PersonalView';
import CargosView from '@/components/CargosView';
import MarketplaceView from '@/components/MarketplaceView';
import InmueblesView from '@/components/InmueblesView';
import PuntoVentaView from '@/components/PuntoVentaView';
import HistorialPOSView from '@/components/HistorialPOSView';
import VendedorPortalView from '@/components/VendedorPortalView';
import CRMView from '@/components/CRMView';
import ChatView from '@/components/ChatView';

const BIMViewer = dynamic(() => import('@/components/BIMViewer'), { ssr: false });

function BIMViewerStandalone() {
  const { state } = useStore();
  const [selectedProyecto, setSelectedProyecto] = useState(state.proyectos[0]?.id || null);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <div>
          <h1>Visor BIM 3D</h1>
          <div className="page-header-subtitle">Modelos IFC por proyecto y disciplina</div>
        </div>
        <select
          value={selectedProyecto || ''}
          onChange={e => setSelectedProyecto(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600 }}
        >
          <option value="">— Seleccionar Proyecto —</option>
          {state.proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <BIMViewer proyectoId={selectedProyecto} isStandalone={false} />
      </div>
    </div>
  );
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { state, dispatch, dataLoading } = useStore();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [activeProyectoId, setActiveProyectoId] = useState(null);

  // Muro de Seguridad: Si no es corporativo, redirigir al Marketplace
  useEffect(() => {
    if (user) {
      const allowedEmails = ['gsalo90@outlook.com', 'guillermosalomonsolarte@gmail.com', 'arq.guillermo_salomon@kalarti.com'];
      const isCorporate = user.email?.endsWith('@kalarti.com') || allowedEmails.includes(user.email);
      if (!isCorporate && activeSection === 'dashboard') {
        setActiveSection('marketplace');
      }
    }
  }, [user, activeSection]);

  // Listener: navegar a Personal y abrir perfil desde otros módulos
  useEffect(() => {
    const handleNavToPersonal = (e) => {
      setActiveSection('personal');
      // Pequeño delay para que PersonalView se monte antes de disparar el evento de edición
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('edit-person-profile', { detail: e.detail }));
      }, 200);
    };
    window.addEventListener('navigate-to-personal', handleNavToPersonal);
    return () => window.removeEventListener('navigate-to-personal', handleNavToPersonal);
  }, []);

  // Auth loading spinner
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafafa',
      }}>
        <div style={{ textAlign: 'center' }}>
            <img src="/kalarti-logo.png" alt="Kalarti" style={{
              width: 56, height: 56, borderRadius: 14, marginBottom: 16,
            }} />
          <div style={{ fontSize: 14, color: '#737373' }}>Cargando...</div>
        </div>
      </div>
    );
  }

  // Not logged in → show login
  if (!user) {
    return <LoginView />;
  }
  // Resolve effective role: prefer app_role from personal table (admin can change it), fallback to auth metadata
  const personalRecord = state.personal?.find(p => p.email === user.email || p.user_id === user.id);
  let userRole = (personalRecord?.app_role || user.user_metadata?.role || '').toUpperCase();
  
  // BYPASS DE EMERGENCIA PARA EL ADMINISTRADOR
  const adminEmails = ['gsalo90@outlook.com', 'guillermosalomonsolarte@gmail.com', 'arq.guillermo_salomon@kalarti.com'];
  if (adminEmails.includes(user?.email)) userRole = 'ADMIN';

  // Role-based interception: Mobile/field workers
  if (userRole === 'TIENDA') {
    return <VendedorPortalView />;
  }

  const fieldRoles = ['CUADRILLA', 'GERENCIA', 'INTERVENTOR', 'ING_RESIDENTE', 'ARQ_RESIDENTE', 'PRACTICANTE', 'ALMACEN'];
  if (fieldRoles.includes(userRole)) {
    return <CuadrillaPortalView />;
  }

  const handleOpenHub = (proyectoId) => {
    setActiveProyectoId(proyectoId);
    setActiveSection('project_hub');
  };

  const handleBackFromHub = () => {
    setActiveProyectoId(null);
    setActiveSection('proyectos');
  };

  const renderSection = () => {
    // Show loading overlay while data hydrates from Supabase
    if (dataLoading) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60vh',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📦</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Cargando datos...</div>
            <div style={{ fontSize: 12, color: '#737373' }}>Sincronizando con la base de datos</div>
          </div>
        </div>
      );
    }

    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'insumos':
        return <InsumosView />;
      case 'personal':
        return <PersonalView />;
      case 'cargos':
        return <CargosView />;
      case 'apu':
        return <APUView />;
      case 'proyectos':
        return <ProyectosView onOpenHub={handleOpenHub} />;
      case 'project_hub':
        return (
          <ProjectHubView
            proyectoId={activeProyectoId}
            onBack={handleBackFromHub}
          />
        );
      case 'visor-3d':
        return <BIMViewerStandalone />;
      case 'bim-5d':
        return <BIM5DView />;
      case 'reportes':
        return <ReportsView />;
      case 'progreso':
        return <ProgressView />;
      case 'logistica':
        return <LogisticsView />;
      case 'finanzas':
        return <FinanceView />;
      case 'nomina':
        return <NominaView />;
      case 'marketplace':
        return <MarketplaceView />;
      case 'inmuebles':
        return <InmueblesView />;
      case 'punto-venta':
        return <PuntoVentaView />;
      case 'historial-pos':
        return <HistorialPOSView />;
      case 'crm':
        return <CRMView />;
      case 'chat-history':
        return <ChatView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      {/* Barra de Acciones Superior (Global) */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 240, // Sidebar width
        right: 0,
        height: 48,
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 24px',
        gap: 12,
        zIndex: 1000
      }}>
        <div style={{ fontSize: 11, color: '#64748b', marginRight: 'auto' }}>
          {state.history?.length > 0 ? `Historial: ${state.history.length} cambios` : 'Sesión iniciada'}
          {state.future?.length > 0 && ` (+${state.future.length} adelante)`}
        </div>
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={() => {
            if (confirm('¿Deseas deshacer el último cambio?')) dispatch({ type: 'UNDO' });
          }}
          disabled={!state.history || state.history.length === 0}
          title="Deshacer (Undo)"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
        >
          ↩️ Deshacer
        </button>
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={() => dispatch({ type: 'REDO' })}
          disabled={!state.future || state.future.length === 0}
          title="Rehacer (Redo)"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
        >
          Rehacer ↪️
        </button>
      </div>

      <Sidebar
        activeSection={activeSection}
        onNavigate={(id) => { setActiveSection(id); setActiveProyectoId(null); }}
      />
      <main className="main-content" style={{ marginTop: 48 }}>
        {renderSection()}
      </main>

      {/* Botón flotante de Telegram */}
      <a 
        href="https://t.me/Kalarti_bot" 
        target="_blank" 
        rel="noopener noreferrer"
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '60px',
          height: '60px',
          backgroundColor: '#0088cc',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(0, 136, 204, 0.4)',
          cursor: 'pointer',
          zIndex: 9999,
          transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s',
          color: 'white',
          fontSize: '30px',
          textDecoration: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1) rotate(10deg)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 136, 204, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 136, 204, 0.4)';
        }}
        title="Hablar con Copiloto Telegram"
      >
        ✈️
      </a>
    </div>
  );
}
