import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const timestamp = Date.now();
    // 1. Insumos
    const { data: insumo1, error: e1 } = await supabase.from('insumos').insert({ codigo: 'MAT-E2E-' + timestamp, nombre: 'Cemento Portland (Prueba)', tipo: 'MATERIAL', unidad: 'Bolsa', precio_unitario: 25000 }).select().single();
    const { data: insumo2, error: e2 } = await supabase.from('insumos').insert({ codigo: 'MO-E2E-' + timestamp, nombre: 'Oficial Albañil (Prueba)', tipo: 'MANO_OBRA', unidad: 'Día', precio_unitario: 80000 }).select().single();
    
    if (e1 || e2) throw new Error('Error insertando insumos: ' + (e1?.message || e2?.message));

    // 2. APU
    const { data: apu1, error: e3 } = await supabase.from('apus').insert({ codigo: 'AB-E2E-' + timestamp, nombre: 'Muro de Mampostería (Prueba)', tipo: 'BASICO', unidad: 'm2', rendimiento: 10 }).select().single();
    if (e3) throw new Error('Error insertando APU: ' + e3.message);

    // 3. APU Detalles
    await supabase.from('apu_detalles').insert([
      { apu_id: apu1.id, insumo_id: insumo1.id, cantidad: 0.5, desperdicio_pct: 5 },
      { apu_id: apu1.id, insumo_id: insumo2.id, cantidad: 0.1, desperdicio_pct: 0 }
    ]);
    
    // 4. Proyecto
    const { data: proy, error: e4 } = await supabase.from('proyectos').insert({ codigo: 'PRY-E2E-' + timestamp, nombre: 'Proyecto Test End-to-End', cliente: 'Cliente Prueba', estado: 'PLANIFICACION', aiu_admin: 10, aiu_imprev: 5, aiu_utilidad: 5 }).select().single();
    if (e4) throw new Error('Error insertando Proyecto: ' + e4.message);

    // 5. Bodega
    const { data: bod, error: e5 } = await supabase.from('bodegas').insert({ proyecto_id: proy.id, nombre: 'Bodega Principal E2E' }).select().single();
    if (e5) throw new Error('Error insertando Bodega: ' + e5.message);

    // 6. Inventario (Entrada inicial)
    await supabase.from('inventario_transacciones').insert([
      { bodega_id: bod.id, insumo_id: insumo1.id, tipo: 'ENTRADA', cantidad: 100, motivo: 'Compra Inicial' }
    ]);
    
    // 7. Presupuesto
    const { data: pItem } = await supabase.from('presupuesto_items').insert({ proyecto_id: proy.id, apu_id: apu1.id, cantidad: 50, capitulo: 'OBRA NEGRA', num_cuadrillas: 2, fecha_inicio: '2026-05-01' }).select().single();
    
    // 8. Pago Cliente
    await supabase.from('pagos_cliente').insert({ proyecto_id: proy.id, valor_bruto: 1000000, iva: 19, retencion_garantia: 5, valor_neto: 1140000, fecha: '2026-04-16' });

    return NextResponse.json({ success: true, message: '¡Datos E2E creados correctamente!', proyecto_id: proy.id });
  } catch (error) {
    console.error('Seed Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
