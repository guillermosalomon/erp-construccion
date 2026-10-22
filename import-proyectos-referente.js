const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
const xlsx = require('xlsx');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const FILE_RICAURTE = 'D:\\DPTO. ARQUITECTURA\\A - Ing. Ana\\CASA RICAURTE\\PRESUPUESTO_CANTIDADES_CASA_RICAURTE.xlsx';
const FILE_IPIALES = 'D:\\DPTO. ARQUITECTURA\\A - Ing. Ana\\CASA RICAURTE\\PRESUPUESTO_H CIVIL IPIALES_OBRACIVIL_2026_07_28_REFERENTE.xlsx';

async function importProyectos() {
  console.log('🔄 Iniciando importación de Proyectos y Presupuestos al ERP...');

  const { data: auth, error: aErr } = await supabase.auth.signInWithPassword({
    email: 'guillermosalomonsolarte@gmail.com',
    password: 'l043211?'
  });
  if (aErr) {
    console.error('❌ Error de autenticación:', aErr.message);
    process.exit(1);
  }
  const userId = auth.user.id;
  console.log('✅ Autenticado como:', auth.user.email, '(ID:', userId, ')');

  // Cargar mapas de insumos, cargos y apus existentes
  console.log('\n📥 Cargando catálogos de base de datos...');
  const { data: dbInsumos } = await supabase.from('insumos').select('id, codigo, nombre');
  const { data: dbCargos } = await supabase.from('cargos').select('id, codigo, nombre');
  const { data: dbApus } = await supabase.from('apu').select('id, codigo, nombre');

  const insumoCodeMap = new Map();
  (dbInsumos || []).forEach(i => {
    if (i.codigo) insumoCodeMap.set(i.codigo.toUpperCase().trim(), i);
  });

  const cargoCodeMap = new Map();
  (dbCargos || []).forEach(c => {
    if (c.codigo) cargoCodeMap.set(c.codigo.toUpperCase().trim(), c);
  });

  const apuCodeMap = new Map();
  (dbApus || []).forEach(a => {
    if (a.codigo) apuCodeMap.set(a.codigo.toUpperCase().trim(), a);
    if (a.nombre) apuCodeMap.set(a.nombre.toUpperCase().trim(), a);
  });

  // ══════════════════════════════════════════════════════════════════════
  // 1. PROYECTO 1: CASA RICAURTE - OBRA CIVIL
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n🏡 Procesando Proyecto: Casa Ricaurte...');
  const { data: existingRicaurte } = await supabase.from('proyectos')
    .select('id, nombre')
    .ilike('nombre', '%Casa Ricaurte%')
    .limit(1);

  let ricaurteId = existingRicaurte && existingRicaurte[0] ? existingRicaurte[0].id : null;

  if (!ricaurteId) {
    const { data: newP, error: errP } = await supabase.from('proyectos').insert({
      codigo: 'PRY-002',
      nombre: 'Casa Ricaurte - Obra Civil',
      cliente: 'Arq. Ana & Ing. Civil',
      ubicacion: 'Ricaurte / Nariño',
      estado: 'EN_EJECUCION',
      tipo_obra: 'residencial',
      aiu_admin: 10,
      aiu_imprev: 5,
      aiu_utilidad: 5,
      aiu_iva: 19,
      user_id: userId,
      creado_por: auth.user.email,
    }).select().single();

    if (errP) {
      console.error('❌ Error creando proyecto Ricaurte:', errP.message);
      return;
    }
    ricaurteId = newP.id;
    console.log('✅ Proyecto creado con ID:', ricaurteId);
  } else {
    console.log('ℹ️ Proyecto Casa Ricaurte existente con ID:', ricaurteId);
  }

  // Leer IMPORTACION_ERP de Casa Ricaurte
  const wbR = xlsx.readFile(FILE_RICAURTE);
  const wsImp = wbR.Sheets['IMPORTACION_ERP'];
  const jsonImp = xlsx.utils.sheet_to_json(wsImp, { header: 1 });

  // Limpiar presupuesto previo de este proyecto
  await supabase.from('presupuesto_items').delete().eq('proyecto_id', ricaurteId);

  const presupuestoItemsToInsert = [];
  let apusCreados = 0;

  for (let i = 3; i < jsonImp.length; i++) {
    const r = jsonImp[i];
    if (!r || !r[0] || !r[3]) continue;

    const codItem = String(r[0]).trim();
    const codApu = r[1] ? String(r[1]).trim().toUpperCase() : `APU-${codItem}`;
    const capitulo = (r[2] || 'OBRA CIVIL').toString().trim();
    const descripcion = String(r[3]).trim();
    const unidad = (r[4] || 'UND').toString().trim();
    const cantidad = parseFloat(r[5]) || 0;

    // Buscar o crear APU
    let apu = apuCodeMap.get(codApu) || apuCodeMap.get(descripcion.toUpperCase());

    if (!apu) {
      const { data: newApu, error: aErr } = await supabase.from('apu').insert({
        codigo: codApu,
        nombre: descripcion,
        unidad,
        categoria_apu: capitulo.split('-')[1]?.trim() || capitulo,
        user_id: userId,
      }).select().single();

      if (!aErr && newApu) {
        apu = newApu;
        apuCodeMap.set(codApu, newApu);
        apuCodeMap.set(descripcion.toUpperCase(), newApu);
        apusCreados++;
      } else if (aErr) {
        console.warn(`Error creando APU ${codApu}:`, aErr.message);
      }
    }

    if (apu && apu.id) {
      presupuestoItemsToInsert.push({
        proyecto_id: ricaurteId,
        apu_id: apu.id,
        cantidad: cantidad > 0 ? cantidad : 1,
        descripcion,
        capitulo,
        orden: i - 2,
        user_id: userId,
        fecha_inicio: new Date().toISOString().split('T')[0],
        num_cuadrillas: 1,
      });
    }
  }

  console.log(`✅ APUs nuevos registrados en catálogo: ${apusCreados}`);
  console.log(`📥 Insertando ${presupuestoItemsToInsert.length} ítems en presupuesto_items para Casa Ricaurte...`);

  let itemsInsertadosRicaurte = 0;
  for (let i = 0; i < presupuestoItemsToInsert.length; i += 40) {
    const batch = presupuestoItemsToInsert.slice(i, i + 40);
    const { data: dIns, error: insErr } = await supabase.from('presupuesto_items').insert(batch).select();
    if (!insErr && dIns) itemsInsertadosRicaurte += dIns.length;
    else if (insErr) console.warn('Error lote presupuesto:', insErr.message);
  }
  console.log(`✅ Presupuesto de Casa Ricaurte cargado exitosamente: ${itemsInsertadosRicaurte} actividades.`);

  // ─── APU_ERP (Desglose analítico de APUs) ───
  console.log('\n🔍 Procesando desglose analítico de APUs (APU_ERP)...');
  const wsApu = wbR.Sheets['APU_ERP'];
  const jsonApu = xlsx.utils.sheet_to_json(wsApu, { header: 1 });

  let detallesInsertados = 0;
  const apuDetallesToInsert = [];

  for (let i = 1; i < jsonApu.length; i++) {
    const r = jsonApu[i];
    if (!r || !r[1] || !r[6]) continue;

    const rendimiento = parseFloat(r[4]) || 1;
    const codApu = String(r[6]).trim().toUpperCase();
    const codInsumo = r[7] ? String(r[7]).trim().toUpperCase() : null;

    const apu = apuCodeMap.get(codApu);
    if (!apu) continue;

    let insumoId = null;
    let cargoId = null;

    if (codInsumo && codInsumo.startsWith('CAR-')) {
      const cg = cargoCodeMap.get(codInsumo);
      if (cg) cargoId = cg.id;
    } else if (codInsumo) {
      const ins = insumoCodeMap.get(codInsumo);
      if (ins) insumoId = ins.id;
    }

    if (!insumoId && !cargoId) {
      const insByName = (dbInsumos || []).find(x => x.nombre?.toLowerCase().trim() === String(r[1]).toLowerCase().trim());
      if (insByName) insumoId = insByName.id;
    }

    if (insumoId || cargoId) {
      apuDetallesToInsert.push({
        apu_id: apu.id,
        insumo_id: insumoId,
        cargo_id: cargoId,
        cantidad: rendimiento,
        desperdicio_pct: 0,
        unidad_detalle: r[3] || 'UN',
        user_id: userId,
      });
    }
  }

  for (let i = 0; i < apuDetallesToInsert.length; i += 50) {
    const batch = apuDetallesToInsert.slice(i, i + 50);
    const { data: dDet, error: eDet } = await supabase.from('apu_detalle').insert(batch).select();
    if (!eDet && dDet) detallesInsertados += dDet.length;
  }
  console.log(`✅ Desglose analítico insertado en apu_detalle: ${detallesInsertados} líneas.`);

  // ══════════════════════════════════════════════════════════════════════
  // 2. PROYECTO 2: HOSPITAL CIVIL IPIALES - CARDIOLOGÍA
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n🏥 Procesando Proyecto: Hospital Civil Ipiales...');
  const { data: existingIpiales } = await supabase.from('proyectos')
    .select('id, nombre')
    .ilike('nombre', '%Hospital Civil Ipiales%')
    .limit(1);

  let ipialesId = existingIpiales && existingIpiales[0] ? existingIpiales[0].id : null;

  if (!ipialesId) {
    const { data: newIp, error: errIp } = await supabase.from('proyectos').insert({
      codigo: 'PRY-003',
      nombre: 'Hospital Civil Ipiales - Cardiología',
      cliente: 'Hospital Civil de Ipiales E.S.E.',
      ubicacion: 'Ipiales / Nariño',
      estado: 'PLANEACION',
      tipo_obra: 'institucional',
      aiu_admin: 10,
      aiu_imprev: 5,
      aiu_utilidad: 5,
      aiu_iva: 19,
      user_id: userId,
      creado_por: auth.user.email,
    }).select().single();

    if (!errIp && newIp) {
      ipialesId = newIp.id;
      console.log('✅ Proyecto creado con ID:', ipialesId);
    }
  } else {
    console.log('ℹ️ Proyecto Hospital Civil Ipiales existente con ID:', ipialesId);
  }

  // Cargar actividades de CUADRO PRESUPUESTO de Hospital Civil Ipiales
  if (ipialesId) {
    const wbI = xlsx.readFile(FILE_IPIALES);
    const wsI = wbI.Sheets['CUADRO PRESUPUESTO'];
    const jsonI = xlsx.utils.sheet_to_json(wsI, { header: 1 });

    await supabase.from('presupuesto_items').delete().eq('proyecto_id', ipialesId);

    const itemsIpiales = [];
    let currentCapitulo = 'OBRA CIVIL';

    for (let i = 5; i < Math.min(jsonI.length, 300); i++) {
      const r = jsonI[i];
      if (!r || !r[1]) continue;

      const desc = String(r[1]).trim();
      const unidad = r[2] ? String(r[2]).trim() : '';
      const cantidad = parseFloat(r[3]) || 0;

      if (!unidad && !cantidad) {
        currentCapitulo = desc;
        continue;
      }

      if (cantidad > 0) {
        let apu = apuCodeMap.get(desc.toUpperCase());
        if (!apu) {
          // Crear APU para la actividad
          const { data: nApu } = await supabase.from('apu').insert({
            codigo: `APU-HOSP-${itemsIpiales.length + 1}`,
            nombre: desc,
            unidad: unidad || 'UND',
            categoria_apu: currentCapitulo.slice(0, 30),
            user_id: userId,
          }).select().single();
          if (nApu) {
            apu = nApu;
            apuCodeMap.set(desc.toUpperCase(), nApu);
          }
        }

        if (apu && apu.id) {
          itemsIpiales.push({
            proyecto_id: ipialesId,
            apu_id: apu.id,
            cantidad,
            descripcion: desc,
            capitulo: currentCapitulo,
            orden: itemsIpiales.length + 1,
            user_id: userId,
            fecha_inicio: new Date().toISOString().split('T')[0],
            num_cuadrillas: 1,
          });
        }
      }
    }

    let itemsInsertadosIpiales = 0;
    for (let i = 0; i < itemsIpiales.length; i += 40) {
      const batch = itemsIpiales.slice(i, i + 40);
      const { data: dIns, error: eIns } = await supabase.from('presupuesto_items').insert(batch).select();
      if (!eIns && dIns) itemsInsertadosIpiales += dIns.length;
    }
    console.log(`✅ Presupuesto de Hospital Civil Ipiales cargado con ${itemsInsertadosIpiales} actividades.`);
  }

  console.log('\n🎉 ¡Importación completada! Ahora la base de datos del ERP tiene todos los proyectos, presupuestos y desgloses cargados.');
}

importProyectos().catch(console.error);
