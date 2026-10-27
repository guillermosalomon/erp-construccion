import { conectar } from '../catalogo/lib.mjs';
const sb = await conectar();
const checks = { inventario_transacciones: ['bodega_id','insumo_id','tipo','cantidad','costo_real','presupuesto_item_id','motivo'], mk_pedidos: ['total','subtotal','comprador_id','estado','items','user_id'], pagos_plataforma: ['user_id','producto','proveedor','estado','monto'], bodegas: ['proyecto_id','nombre','user_id'], proyectos: ['ubicacion','user_id','estado'], pos_agenda: ['tienda_id','punto_venta_id','tipo','estado'], chat_usuarios: ['email'], clientes: ['email'], personal: ['email'] };
for (const [t, cols] of Object.entries(checks)) for (const c of cols) { const { error } = await sb.from(t).select(c).limit(0); if (error) console.log('FALTA', t + '.' + c, error.message); }
console.log('fin');
