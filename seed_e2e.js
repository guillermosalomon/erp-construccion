const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  if (line && line.includes('=')) {
    const [key, ...rest] = line.split('=');
    envVars[key.trim()] = rest.join('=').trim().replace(/['"\r]/g, '');
  }
});

const url = envVars.NEXT_PUBLIC_SUPABASE_URL;
const key = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function run() {
  console.log('Generando datos de prueba End-to-End...');
  
  // 1. Insumos
  const { data: insumo1, error: errI1 } = await supabase.from('insumos').insert({ codigo: 'MAT-E2E-001', nombre: 'Cemento Portland (Prueba)', tipo: 'MATERIAL', unidad: 'Bolsa', precio_unitario: 25000 }).select().single();
  const { data: insumo2 } = await supabase.from('insumos').insert({ codigo: 'MO-E2E-001', nombre: 'Oficial Albañil (Prueba)', tipo: 'MANO_OBRA', unidad: 'Día', precio_unitario: 80000 }).select().single();
  
  if (errI1) console.error('Error insertando insumo', errI1);
  
  // 2. APU
  const { data: apu1, error: errApu } = await supabase.from('apus').insert({ codigo: 'AB-E2E-001', nombre: 'Muro de Mampostería (Prueba)', tipo: 'BASICO', unidad: 'm2', rendimiento: 10 }).select().single();
  if (errApu) console.error('Error insertando APU', errApu);
  
  // 3. APU Detalles
  await supabase.from('apu_detalles').insert([
    { apu_id: apu1.id, insumo_id: insumo1.id, cantidad: 0.5, desperdicio_pct: 5 },
    { apu_id: apu1.id, insumo_id: insumo2.id, cantidad: 0.1, desperdicio_pct: 0 }
  ]);
  
  // 4. Proyecto
  const { data: proy, error: errProy } = await supabase.from('proyectos').insert({ codigo: 'PRY-E2E-001', nombre: 'Proyecto Test End-to-End', cliente: 'Cliente Prueba', estado: 'PLANIFICACION', aiu_admin: 10, aiu_imprev: 5, aiu_utilidad: 5 }).select().single();
  if (errProy) console.error('Error insertando Proyecto', errProy);
  
  // 5. Bodega
  const { data: bod } = await supabase.from('bodegas').insert({ proyecto_id: proy.id, nombre: 'Bodega Principal E2E' }).select().single();
  
  // 6. Inventario (Entrada inicial)
  await supabase.from('inventario_transacciones').insert([
    { bodega_id: bod.id, insumo_id: insumo1.id, tipo: 'ENTRADA', cantidad: 100, motivo: 'Compra Inicial' }
  ]);
  
  // 7. Presupuesto
  const { data: pItem } = await supabase.from('presupuesto_items').insert({ proyecto_id: proy.id, apu_id: apu1.id, cantidad: 50, capitulo: 'OBRA NEGRA', num_cuadrillas: 2, fecha_inicio: '2026-05-01' }).select().single();
  
  // 8. Pago Cliente (Para no bloquear financieramente todo)
  await supabase.from('pagos_cliente').insert({ proyecto_id: proy.id, valor_bruto: 1000000, iva: 19, retencion_garantia: 5, valor_neto: 1140000, fecha: '2026-04-16' });
  
  console.log('¡Proyecto de prueba generado correctamente en la base de datos!');
}

run().catch(console.error);
