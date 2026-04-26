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
  const { dataLoading } = useStore();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [activeProyectoId, setActiveProyectoId] = useState(null);

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
          <div style={{
            width: 56, height: 56, background: '#2563eb', borderRadius: 14,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 22, marginBottom: 16,
          }}>EC</div>
          <div style={{ fontSize: 14, color: '#737373' }}>Cargando...</div>
        </div>
      </div>
    );
  }

  // Not logged in → show login
  if (!user) {
    return <LoginView />;
  }

  // Role-based interception: Field workers and mobile roles use isolated field portal
  const fieldRoles = ['CUADRILLA', 'GERENCIA', 'INTERVENTOR', 'ING_RESIDENTE', 'ARQ_RESIDENTE', 'PRACTICANTE', 'ALMACEN'];
  if (fieldRoles.includes(user.user_metadata?.role)) {
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
      case 'apu-basicos':
        return <APUView tipo="BASICO" />;
      case 'apu-compuestos':
        return <APUView tipo="COMPUESTO" />;
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
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        activeSection={activeSection}
        onNavigate={(id) => { setActiveSection(id); setActiveProyectoId(null); }}
      />
      <main className="main-content">
        {renderSection()}
      </main>
    </div>
  );
}
