import { conectar } from './lib.mjs';
const sb = await conectar();
const T = 'apu apu_detalle bim_links bodegas cargo_detalle cargos categorias chat_cotizaciones chat_mensajes chat_usuarios clientes control_asistencia cotizador_catalogo cotizador_cuadrillas cotizador_solicitudes erp_ordenes_compra erp_proveedores global_config inmueble_fotos inmueble_leads inmuebles insumo_cotizaciones insumos inventario_transacciones item_checklist_items item_documents item_notes marketing_leads mk_ofertas mk_ofertas_historial_precios mk_pedidos mk_puntos_venta mk_tiendas obra_avances pagos_cliente pagos_plataforma personal personal_proyecto plantillas pos_agenda presupuesto_items profiles proyecto_agenda proyectos suscripciones usuarios mk_productos productos_pos'.split(' ');
for (const t of T) {
  const { data, count, error } = await sb.from(t).select('*', { count: 'exact' }).limit(1);
  console.log(t.padEnd(30), error ? 'NO EXISTE / ' + error.message.slice(0, 50) : String(count).padStart(6) + '  cols: ' + Object.keys(data?.[0] || {}).join(',').slice(0, 230));
}
