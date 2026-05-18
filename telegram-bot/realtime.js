/**
 * telegram-bot/realtime.js — Listener de cambios en tiempo real en Supabase
 */
const { createClient } = require('@supabase/supabase-js');
const { initNotifier } = require('./notifier');
const db = require('./db');

// Configuración de Supabase (debe coincidir con db.js)
const SUPABASE_URL = 'https://hnbssxtdagzrbedrdynn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYnNzeHRkYWd6cmJlZHJkeW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTk2NzMsImV4cCI6MjA5MTkzNTY3M30.hKyFG4CVN8H3-bbpQQUn9zPdzhPIRGaRGz_mqu50oyo';

async function startRealtime(bot) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const notifier = await initNotifier(bot);

  console.log('📡 Supabase Realtime Listener iniciado...');

  // 1. Escuchar Proyectos (Nuevos Proyectos)
  supabase
    .channel('proyectos-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'proyectos' }, async (payload) => {
      console.log('🆕 Nuevo Proyecto detectado:', payload.new.nombre);
      const proyecto = payload.new;
      
      // Crear Canal/Tema para el proyecto
      await notifier.createProjectTopic(proyecto);
      
      // Notificar a interesados iniciales
      await notifier.announceProjectAssignment(proyecto.id);
    })
    .subscribe();

  // 2. Escuchar Asignaciones de Personal (personal_proyecto)
  supabase
    .channel('assignments-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'personal_proyecto' }, async (payload) => {
      console.log('👷 Nueva asignación de personal:', payload.new.personal_id);
      await notifier.announceProjectAssignment(payload.new.proyecto_id);
    })
    .subscribe();

  // 3. Escuchar Tareas del Presupuesto (presupuesto_items)
  supabase
    .channel('tasks-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'presupuesto_items' }, async (payload) => {
      const item = payload.new;
      const oldItem = payload.old;

      // Si se asignó a una cuadrilla/persona o cambió la asignación
      if (item.asignado_a_cuadrilla && (!oldItem || oldItem.asignado_a_cuadrilla !== item.asignado_a_cuadrilla)) {
        console.log('🛠️ Tarea asignada a:', item.asignado_a_cuadrilla);
        
        // Buscar el ID del personal por nombre (según PresupuestoView.js)
        const { data: persona } = await supabase.from('personal')
          .select('id, telegram_id')
          .eq('nombre', item.asignado_a_cuadrilla)
          .maybeSingle();

        if (persona?.telegram_id) {
          const apuName = item.descripcion || 'Actividad sin nombre';
          await notifier.notifyUser(persona.telegram_id, 
            `👷 *Nueva tarea asignada*\n\n` +
            `🛠️ Tarea: *${apuName}*\n` +
            `📏 Cantidad: ${item.cantidad}\n\n` +
            `Reporta tu avance con /avance`);
        }
      }
    })
    .subscribe();
}

module.exports = { startRealtime };
