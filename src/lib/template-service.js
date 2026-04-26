import { supabase } from './supabase';
import { 
  insumosService, apuService, apuDetalleService, proyectosService, 
  presupuestoService, personalService, cargosService, cargoDetalleService,
  bodegaService, inventarioService, pagosService, obraAvancesService,
  notesService, bimLinksService, configService, personalProyectoService,
  checklistService, itemDocumentsService, asistenciaService
} from './services';

/**
 * ERP Construcción — Servicio de Plantillas
 * Permite exportar e importar el estado completo de la base de datos.
 */

export const templateService = {
  /**
   * Genera un objeto JSON con todas las tablas del estado actual
   */
  async generateTemplate(state, name = "Plantilla ERP") {
    const template = {
      version: "1.0",
      name,
      created_at: new Date().toISOString(),
      data: {
        insumos: state.insumos || [],
        cargos: state.cargos || [],
        cargo_detalle: state.cargoDetalles || [],
        personal: state.personal || [],
        apu: state.apus || [],
        apu_detalle: state.apuDetalles || [],
        proyectos: state.proyectos || [],
        presupuesto_items: state.presupuestoItems || [],
        bodegas: state.bodegas || [],
        inventario_transacciones: state.inventario || [],
        pagos_cliente: state.pagos || [],
        obra_avances: state.avances || [],
        item_notes: state.notas || [],
        bim_links: state.bimLinks || [],
        personal_proyecto: state.personalProyecto || [],
        item_checklist_items: state.itemChecklistItems || [],
        item_documents: state.itemDocuments || [],
        control_asistencia: state.controlAsistencia || [],
        global_config: state.config || []
      }
    };
    return template;
  },

  /**
   * Descarga el JSON al equipo local
   */
  downloadTemplate(template) {
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '_')}_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Importa una plantilla (Reemplazo o Fusión)
   */
  async importTemplate(templateData, mode = 'REPLACE') {
    if (!templateData || !templateData.data) throw new Error("Plantilla inválida");

    const { data } = templateData;
    const oldToNewIds = {}; // Mapeo para mantener integridad referencial

    // Helper para insertar y mapear IDs
    const insertAndMap = async (items, service, tableName, idField = 'id') => {
      if (!items || items.length === 0) return;
      
      for (const item of items) {
        const oldId = item[idField];
        const { id, ...cleanItem } = item;
        
        // Limpiar campos de sistema
        delete cleanItem.created_at;
        delete cleanItem.updated_at;
        delete cleanItem.user_id;

        // Reemplazar IDs de relaciones si existen en el mapa
        Object.keys(cleanItem).forEach(key => {
          if (oldToNewIds[cleanItem[key]]) {
            cleanItem[key] = oldToNewIds[cleanItem[key]];
          }
        });

        try {
          const result = await service.create(cleanItem);
          if (result && result.id) {
            oldToNewIds[oldId] = result.id;
          }
        } catch (e) {
          console.warn(`Error importando en ${tableName}:`, e);
        }
      }
    };

    // ORDEN DE INSERCIÓN CRÍTICO
    console.log("Iniciando importación: ", mode);
    
    await insertAndMap(data.cargos, cargosService, 'cargos');
    await insertAndMap(data.insumos, insumosService, 'insumos');
    await insertAndMap(data.personal, personalService, 'personal');
    await insertAndMap(data.apu, apuService, 'apu');
    await insertAndMap(data.apu_detalle, apuDetalleService, 'apu_detalle');
    await insertAndMap(data.proyectos, proyectosService, 'proyectos');
    await insertAndMap(data.presupuesto_items, presupuestoService, 'presupuesto_items');
    await insertAndMap(data.bodegas, bodegaService, 'bodegas');
    await insertAndMap(data.inventario_transacciones, inventarioService, 'inventario');
    await insertAndMap(data.pagos_cliente, pagosService, 'pagos');
    await insertAndMap(data.obra_avances, obraAvancesService, 'avances');
    await insertAndMap(data.item_notes, notesService, 'notas');
    await insertAndMap(data.bim_links, bimLinksService, 'bim_links');
    await insertAndMap(data.personal_proyecto, personalProyectoService, 'personal_proyecto');
    await insertAndMap(data.item_checklist_items, checklistService, 'checklist');
    await insertAndMap(data.item_documents, itemDocumentsService, 'docs');
    await insertAndMap(data.control_asistencia, asistenciaService, 'asistencia');

    return true;
  },

  /**
   * Sube la plantilla a Supabase Storage para compartir
   */
  async uploadToCloud(template, userId) {
    const fileName = `${userId}/${template.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
    const blob = new Blob([JSON.stringify(template)], { type: 'application/json' });
    
    const { data, error } = await supabase.storage
      .from('plantillas')
      .upload(fileName, blob);
      
    if (error) throw error;
    return data;
  },

  /**
   * Lista plantillas disponibles en la nube
   */
  async listCloudTemplates() {
    const { data, error } = await supabase.storage
      .from('plantillas')
      .list('', { limit: 100, sortBy: { column: 'name', order: 'desc' } });
      
    if (error) throw error;
    return data;
  }
};
