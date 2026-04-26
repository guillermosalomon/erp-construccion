import { supabase } from './supabase';

/* ============================================================
   ERP Construcción — Capa de Servicios Supabase
   Cada servicio opera contra una tabla específica.
   Si Supabase no está configurado, retorna null (modo offline).
   ============================================================ */

const db = () => supabase; // shorthand — null si no hay credenciales

/* ─── Helper: get current user ID ─── */
async function getUserId() {
  if (!db()) return null;
  const { data: { user } } = await db().auth.getUser();
  return user?.id || null;
}


/* ─── Insumos ─── */
export const insumosService = {
  async getAll() {
    if (!db()) return null;
    const { data, error } = await db().from('insumos').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },
  async create(insumo) {
    if (!db()) return null;
    const uid = await getUserId();
    const { data, error } = await db().from('insumos').insert({ ...insumo, user_id: uid }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, changes) {
    if (!db()) return null;
    const { data, error } = await db().from('insumos').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async createBatch(insumos) {
    if (!db()) return null;
    const uid = await getUserId();
    const itemsWithUid = insumos.map(i => ({ ...i, user_id: uid }));
    const { data, error } = await db().from('insumos').insert(itemsWithUid).select();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    if (!db()) return null;
    const { error } = await db().from('insumos').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};

/* ─── APU ─── */
export const apuService = {
  async getAll() {
    if (!db()) return null;
    const { data, error } = await db().from('apu').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },
  async create(apu) {
    if (!db()) return null;
    const uid = await getUserId();
    const { data, error } = await db().from('apu').insert({ ...apu, user_id: uid }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, changes) {
    if (!db()) return null;
    const { data, error } = await db().from('apu').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    if (!db()) return null;
    const { error } = await db().from('apu').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};

/* ─── APU Detalle ─── */
export const apuDetalleService = {
  async getAll() {
    if (!db()) return null;
    const { data, error } = await db().from('apu_detalle').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },
  async create(detalle) {
    if (!db()) return null;
    const uid = await getUserId();
    const { data, error } = await db().from('apu_detalle').insert({ ...detalle, user_id: uid }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, changes) {
    if (!db()) return null;
    const { data, error } = await db().from('apu_detalle').update(changes).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    if (!db()) return null;
    const { error } = await db().from('apu_detalle').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};

/* ─── Proyectos ─── */
export const proyectosService = {
  async getAll() {
    if (!db()) return null;
    const { data, error } = await db().from('proyectos').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },
  async create(proyecto) {
    if (!db()) return null;
    const uid = await getUserId();
    const { data, error } = await db().from('proyectos').insert({ ...proyecto, user_id: uid }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, changes) {
    if (!db()) return null;
    const { data, error } = await db().from('proyectos').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    if (!db()) return null;
    const { error } = await db().from('proyectos').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};

/* ─── Presupuesto Items ─── */
export const presupuestoService = {
  async getAll() {
    if (!db()) return null;
    const { data, error } = await db().from('presupuesto_items').select('*').order('orden', { ascending: true });
    if (error) throw error;
    return data;
  },
  async create(item) {
    if (!db()) return null;
    const uid = await getUserId();
    const { data, error } = await db().from('presupuesto_items').insert({ ...item, user_id: uid }).select().single();
    if (error) throw error;
    return data;
  },
  async createBatch(items) {
    if (!db()) return null;
    const uid = await getUserId();
    const itemsWithUid = items.map(i => ({ ...i, user_id: uid }));
    const { data, error } = await db().from('presupuesto_items').insert(itemsWithUid).select();
    if (error) throw error;
    return data;
  },
  async update(id, changes) {
    if (!db()) return null;
    const { data, error } = await db().from('presupuesto_items').update(changes).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    if (!db()) return null;
    const { error } = await db().from('presupuesto_items').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
  async removeByProyecto(proyectoId) {
    if (!db()) return null;
    const { error } = await db().from('presupuesto_items').delete().eq('proyecto_id', proyectoId);
    if (error) throw error;
    return true;
  },
};

/* ─── BIM Links ─── */
export const bimLinksService = {
  async getAll() {
    if (!db()) return null;
    const { data, error } = await db().from('bim_links').select('*');
    if (error) throw error;
    return data;
  },
  async create(link) {
    if (!db()) return null;
    const uid = await getUserId();
    const { data, error } = await db().from('bim_links').insert({ ...link, user_id: uid }).select().single();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    if (!db()) return null;
    const { error } = await db().from('bim_links').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};

/* ─── Obra Avances ─── */
export const obraAvancesService = {
  async getAll() {
    if (!db()) return null;
    const { data, error } = await db().from('obra_avances').select('*').order('fecha', { ascending: true });
    if (error) throw error;
    return data;
  },
  async create(avance) {
    if (!db()) return null;
    const uid = await getUserId();
    const { data, error } = await db().from('obra_avances').insert({ ...avance, user_id: uid }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, changes) {
    if (!db()) return null;
    const { data, error } = await db().from('obra_avances').update(changes).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    if (!db()) return null;
    const { error } = await db().from('obra_avances').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};

/* ─── Control Asistencia (Personal/Cuadrillas) ─── */
export const asistenciaService = {
  async getAll() {
    if (!db()) return null;
    const { data, error } = await db().from('control_asistencia').select('*').order('fecha_hora', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(asistencia) {
    if (!db()) return null;
    const uid = await getUserId();
    const { data, error } = await db().from('control_asistencia').insert({ ...asistencia, user_id: uid }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, changes) {
    if (!db()) return null;
    const { data, error } = await db().from('control_asistencia').update(changes).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    if (!db()) return null;
    const { error } = await db().from('control_asistencia').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};

/* ─── Item Notes & Collaboration ─── */
export const notesService = {
  async getAll() {
    if (!db()) return null;
    const { data, error } = await db().from('item_notes').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(note) {
    if (!db()) return null;
    const uid = await getUserId();
    const { data, error } = await db().from('item_notes').insert({ ...note, author_id: uid }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, changes) {
    if (!db()) return null;
    const { data, error } = await db().from('item_notes').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    if (!db()) return null;
    const { error } = await db().from('item_notes').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};

/* ─── Storage (Photos & Docs) ─── */
export const storageService = {
  async uploadPhoto(file) {
    if (!db()) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `notes/${fileName}`;

    const { error } = await db().storage.from('obra-fotos').upload(filePath, file);
    if (error) throw error;

    const { data } = db().storage.from('obra-fotos').getPublicUrl(filePath);
    return data.publicUrl;
  },
  async uploadImage(file, folder = 'asistencia') {
    if (!db()) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.floor(Math.random()*1000)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error } = await db().storage.from('obra-fotos').upload(filePath, file);
    if (error) throw error;

    const { data } = db().storage.from('obra-fotos').getPublicUrl(filePath);
    return data.publicUrl;
  },
  async uploadFile(bucketOrFolder, file, customPath = null) {
    if (!db()) return null;
    // Si bucketOrFolder es una ruta, la usamos. Si no, usamos 'obra-fotos' como bucket por defecto
    const bucket = (bucketOrFolder === 'personal-docs') ? 'personal-docs' : 'obra-fotos';
    const folder = (bucketOrFolder === 'personal-docs') ? '' : bucketOrFolder;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = customPath || (folder ? `${folder}/${fileName}` : fileName);

    const { error } = await db().storage.from(bucket).upload(filePath, file);
    if (error) throw error;

    const { data } = db().storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  },
  async uploadInvoice(file) {
    return this.uploadImage(file, 'invoices');
  }
};

/* ─── Bodegas ─── */
export const bodegaService = {
  async getAll() {
    if (!db()) return null;
    const { data, error } = await db().from('bodegas').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },
  async create(bodega) {
    if (!db()) return null;
    const uid = await getUserId();
    const { data, error } = await db().from('bodegas').insert({ ...bodega, user_id: uid }).select().single();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    if (!db()) return null;
    const { error } = await db().from('bodegas').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};

/* ─── Inventario Transacciones ─── */
export const inventarioService = {
  async getAll() {
    if (!db()) return null;
    const { data, error } = await db().from('inventario_transacciones').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },
  async create(mov) {
    if (!db()) return null;
    const uid = await getUserId();
    const { data, error } = await db().from('inventario_transacciones').insert({ ...mov, user_id: uid }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, changes) {
    if (!db()) return null;
    const { data, error } = await db().from('inventario_transacciones').update({ ...changes }).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    if (!db()) return null;
    const { error } = await db().from('inventario_transacciones').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};

/* ─── Pagos Cliente ─── */
export const pagosService = {
  async getAll() {
    if (!db()) return null;
    const { data, error } = await db().from('pagos_cliente').select('*').order('fecha', { ascending: true });
    if (error) throw error;
    return data;
  },
  async create(pago) {
    if (!db()) return null;
    const uid = await getUserId();
    const { data, error } = await db().from('pagos_cliente').insert({ ...pago, user_id: uid }).select().single();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    if (!db()) return null;
    const { error } = await db().from('pagos_cliente').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};

/* ─── Personal (Mano de Obra) ─── */
export const personalService = {
  async getAll() {
    if (!db()) return null;
    const { data, error } = await db().from('personal').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },
  async create(persona) {
    if (!db()) return null;
    const uid = await getUserId();
    // Validación básica de integridad: si el cargo_id no es un UUID, ignorarlo
    const cargo_id = (persona.cargo_id && persona.cargo_id.length === 36) ? persona.cargo_id : null;
    const { data, error } = await db().from('personal').upsert({ ...persona, cargo_id, user_id: uid }, { onConflict: 'email' }).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async update(id, changes) {
    if (!db()) return null;
    const changesClean = { ...changes };
    if (changesClean.cargo_id && changesClean.cargo_id.length !== 36) {
      changesClean.cargo_id = null;
    }
    const { data, error } = await db().from('personal').update({ ...changesClean, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    if (!db()) return null;
    const { error } = await db().from('personal').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
  async updateByCargoId(cargo_id, changes) {
    if (!db()) return null;
    const { error } = await db().from('personal').update(changes).eq('cargo_id', cargo_id);
    if (error) throw error;
    return true;
  },
  async uploadDocument(file, fileName) {
    if (!db() || !file) return null;
    try {
      const { data, error } = await supabase.storage
        .from('personal-docs')
        .upload(`${Date.now()}-${fileName}`, file, {
          cacheControl: '3600',
          upsert: false
        });
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('personal-docs')
        .getPublicUrl(data.path);
        
      return publicUrl;
    } catch (e) {
      console.error('Error uploading document:', e);
      // Retornar una URL base64 simulada en demo o si falla el bucket
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    }
  }
};

/* ─── Cargos ─── */
export const cargosService = {
  async getAll() {
    if (!db()) return null;
    const { data, error } = await db().from('cargos').select('*');
    if (error) throw error;
    return data;
  },
  async create(cargo) {
    if (!db()) return null;
    const uid = await getUserId();
    const { data, error } = await db().from('cargos').upsert({ ...cargo, user_id: uid }).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async update(id, changes) {
    if (!db()) return null;
    const { data, error } = await db().from('cargos').update(changes).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    if (!db()) return null;
    const { error } = await db().from('cargos').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};

/* ─── Cargo Detalle (Cuadrillas) ─── */
export const cargoDetalleService = {
  async getAll() {
    if (!db()) return null;
    const { data, error } = await db().from('cargo_detalle').select('*');
    if (error) throw error;
    return data;
  },
  async create(detalle) {
    if (!db()) return null;
    const uid = await getUserId();
    const { data, error } = await db().from('cargo_detalle').insert({ ...detalle, user_id: uid }).select().single();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    if (!db()) return null;
    const { error } = await db().from('cargo_detalle').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};
/* ─── Usuarios / Perfiles ─── */
export const usuariosService = {
  async getAll() {
    if (!db()) return [];
    
    try {
      // Intentar leer de profiles primero
      const { data: profiles, error: profErr } = await db().from('profiles').select('*');
      if (!profErr && profiles && profiles.length > 0) return profiles;
      
      // Fallback: leer de personal (cada persona registrada)
      const { data: personal, error: persErr } = await db().from('personal').select('id, email, nombres, apellidos, app_role, profesion');
      if (!persErr && personal && personal.length > 0) {
        return personal.map(p => ({
          id: p.id,
          email: p.email,
          nombre: [p.nombres, p.apellidos].filter(Boolean).join(' ') || p.email,
          role: p.app_role || 'ADMIN',
        }));
      }
      
      return [];
    } catch (e) {
      console.warn('Error loading users:', e);
      return [];
    }
  }
};

/* ─── Personal Proyecto (Asignaciones) ─── */
export const personalProyectoService = {
  async getAll() {
    if (!db()) return null;
    const { data, error } = await db().from('personal_proyecto').select('*');
    if (error) throw error;
    return data;
  },
  async create(asignacion) {
    if (!db()) return null;
    const uid = await getUserId();
    const { data, error } = await db().from('personal_proyecto').upsert({ ...asignacion, user_id: uid }).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    if (!db()) return null;
    const { error } = await db().from('personal_proyecto').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};

/* ─── Checklist de Actividades ─── */
export const checklistService = {
  async getAll() {
    if (!db()) return null;
    const { data, error } = await db().from('item_checklist_items').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },
  async create(item) {
    if (!db()) return null;
    const uid = await getUserId();
    const { data, error } = await db().from('item_checklist_items').insert({ ...item, creado_por: uid }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, changes) {
    if (!db()) return null;
    const { data, error } = await db().from('item_checklist_items').update(changes).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    if (!db()) return null;
    const { error } = await db().from('item_checklist_items').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};

/* ─── Documentos de Actividad ─── */
export const itemDocumentsService = {
  async getAll() {
    if (!db()) return null;
    const { data, error } = await db().from('item_documents').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },
  async create(doc) {
    if (!db()) return null;
    const uid = await getUserId();
    const { data, error } = await db().from('item_documents').insert({ ...doc, creado_por: uid }).select().single();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    if (!db()) return null;
    const { error } = await db().from('item_documents').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};

/* ─── Hydration: carga todos los datos iniciales ─── */
export async function loadAllData() {
  if (!db()) return null;

  // Envoltura para hacer cada llamada resiliente
  const safeLoad = async (promise) => {
    try {
      const res = await promise;
      return res || [];
    } catch (e) {
      console.warn('[Hydration] Partial failure:', e);
      return [];
    }
  };

  const [
    insumos, apus, apuDetalles, proyectos, presupuestoItems, 
    bimLinks, avances, notas, bodegas, inventario, 
    pagos, usuarios, personal, cargos, config, cargoDetalles,
    personalProyecto, itemChecklistItems, itemDocuments, controlAsistencia
  ] = await Promise.all([
    safeLoad(insumosService.getAll()),
    safeLoad(apuService.getAll()),
    safeLoad(apuDetalleService.getAll()),
    safeLoad(proyectosService.getAll()),
    safeLoad(presupuestoService.getAll()),
    safeLoad(bimLinksService.getAll()),
    safeLoad(obraAvancesService.getAll()),
    safeLoad(notesService.getAll()),
    safeLoad(bodegaService.getAll()),
    safeLoad(inventarioService.getAll()),
    safeLoad(pagosService.getAll()),
    safeLoad(usuariosService.getAll()),
    safeLoad(personalService.getAll()),
    safeLoad(cargosService.getAll()),
    safeLoad(configService.getAll()),
    safeLoad(cargoDetalleService.getAll()),
    safeLoad(personalProyectoService.getAll()),
    safeLoad(checklistService.getAll()),
    safeLoad(itemDocumentsService.getAll()),
    safeLoad(asistenciaService.getAll()),
  ]);

  return {
    insumos, apus, apuDetalles, proyectos, presupuestoItems,
    bimLinks, avances, notas, bodegas, inventario,
    pagos, usuarios, personal, cargos, config, cargoDetalles,
    personalProyecto, itemChecklistItems, itemDocuments, controlAsistencia
  };
}

/* ─── Configuración Global (SMLV, etc.) ─── */
export const configService = {
  async getAll() {
    if (!db()) return null;
    const { data, error } = await db().from('global_config').select('*');
    if (error) throw error;
    return data;
  },
  async upsert(clave, valor) {
    if (!db()) return null;
    const uid = await getUserId();
    const { data, error } = await db()
      .from('global_config')
      .upsert({ clave, valor, user_id: uid }, { onConflict: 'clave' })
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }
};
