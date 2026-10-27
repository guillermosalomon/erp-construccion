-- ============================================================
-- FASE 20 — Red logística Kalarti (obras como bodega), Marketplace dropshipping,
--           agenda centralizada, pagos y perfiles unificados.
-- Regla: NO se crean tablas nuevas. Solo columnas, estados, vistas y un trigger.
-- Idempotente. Ejecutar completo en Supabase → SQL Editor.
-- ============================================================

-- Utilidad: elimina los CHECK de una columna (para ampliar estados sin conocer el nombre del constraint)
CREATE OR REPLACE FUNCTION kalarti_drop_checks(p_table TEXT, p_column TEXT) RETURNS void AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public' AND rel.relname = p_table AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%' || p_column || '%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', p_table, r.conname);
  END LOOP;
END $$ LANGUAGE plpgsql;

-- ─── 1. BODEGAS DE OBRA ───
ALTER TABLE bodegas ADD COLUMN IF NOT EXISTS municipio TEXT;
ALTER TABLE bodegas ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE bodegas ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'OBRA';
ALTER TABLE bodegas ADD COLUMN IF NOT EXISTS lat NUMERIC(10,7);
ALTER TABLE bodegas ADD COLUMN IF NOT EXISTS lng NUMERIC(10,7);
ALTER TABLE bodegas ADD COLUMN IF NOT EXISTS activa BOOLEAN DEFAULT TRUE;
ALTER TABLE bodegas ADD COLUMN IF NOT EXISTS responsable_id UUID;

-- Bodega automática al crear un proyecto
CREATE OR REPLACE FUNCTION kalarti_bodega_por_proyecto() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM bodegas WHERE proyecto_id = NEW.id) THEN
    INSERT INTO bodegas (proyecto_id, nombre, municipio, tipo, activa, user_id)
    VALUES (NEW.id, 'Bodega ' || NEW.nombre, split_part(COALESCE(NEW.ubicacion, 'Pasto'), ',', 1), 'OBRA', TRUE, NEW.user_id);
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_bodega_por_proyecto ON proyectos;
CREATE TRIGGER trg_bodega_por_proyecto AFTER INSERT ON proyectos FOR EACH ROW EXECUTE FUNCTION kalarti_bodega_por_proyecto();

-- Backfill: una bodega por proyecto existente
INSERT INTO bodegas (proyecto_id, nombre, municipio, tipo, activa, user_id)
SELECT p.id, 'Bodega ' || p.nombre, trim(split_part(replace(COALESCE(p.ubicacion, 'Pasto'), '/', ','), ',', 1)), 'OBRA', TRUE, p.user_id
FROM proyectos p WHERE NOT EXISTS (SELECT 1 FROM bodegas b WHERE b.proyecto_id = p.id);
UPDATE bodegas b SET municipio = trim(split_part(replace(COALESCE(p.ubicacion, 'Pasto'), '/', ','), ',', 1))
FROM proyectos p WHERE p.id = b.proyecto_id AND b.municipio IS NULL;

-- ─── 2. MOVIMIENTOS DE INVENTARIO ───
-- El tipo puede ser ENUM (tipo_movimiento) o TEXT según cómo se creó la tabla
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_movimiento') THEN
    ALTER TYPE tipo_movimiento ADD VALUE IF NOT EXISTS 'TRASLADO_SALIDA';
    ALTER TYPE tipo_movimiento ADD VALUE IF NOT EXISTS 'TRASLADO_ENTRADA';
    ALTER TYPE tipo_movimiento ADD VALUE IF NOT EXISTS 'CONSUMO';
  END IF;
END $$;
SELECT kalarti_drop_checks('inventario_transacciones', 'tipo');
ALTER TABLE inventario_transacciones ADD COLUMN IF NOT EXISTS costo_unitario NUMERIC(15,2);
ALTER TABLE inventario_transacciones ADD COLUMN IF NOT EXISTS orden_compra_id UUID;
ALTER TABLE inventario_transacciones ADD COLUMN IF NOT EXISTS traslado_ref UUID;
ALTER TABLE inventario_transacciones ADD COLUMN IF NOT EXISTS origen TEXT; -- COMPRA | TRASLADO | AVANCE | AJUSTE | VENTA

-- ─── 3. ÓRDENES: abastecimiento, traslado y dropshipping ───
ALTER TABLE erp_ordenes_compra ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'ABASTECIMIENTO_OBRA'; -- ABASTECIMIENTO_OBRA | TRASLADO | DROPSHIPPING
ALTER TABLE erp_ordenes_compra ADD COLUMN IF NOT EXISTS bodega_origen_id UUID REFERENCES bodegas(id) ON DELETE SET NULL;
ALTER TABLE erp_ordenes_compra ADD COLUMN IF NOT EXISTS bodega_destino_id UUID REFERENCES bodegas(id) ON DELETE SET NULL;
ALTER TABLE erp_ordenes_compra ADD COLUMN IF NOT EXISTS mk_pedido_id UUID;
ALTER TABLE erp_ordenes_compra ADD COLUMN IF NOT EXISTS direccion_entrega TEXT;
ALTER TABLE erp_ordenes_compra ADD COLUMN IF NOT EXISTS contacto_whatsapp TEXT;
ALTER TABLE erp_ordenes_compra ADD COLUMN IF NOT EXISTS requiere_flete BOOLEAN DEFAULT FALSE;
ALTER TABLE erp_ordenes_compra ADD COLUMN IF NOT EXISTS costo_transporte NUMERIC(15,2) DEFAULT 0;
ALTER TABLE erp_ordenes_compra ADD COLUMN IF NOT EXISTS transportador TEXT;
ALTER TABLE erp_ordenes_compra ADD COLUMN IF NOT EXISTS costo_material NUMERIC(15,2) DEFAULT 0;
ALTER TABLE erp_ordenes_compra ADD COLUMN IF NOT EXISTS comparativo JSONB; -- traslado vs compra nueva
SELECT kalarti_drop_checks('erp_ordenes_compra', 'estado');

-- ─── 4. OFERTAS: catálogo (dropshipping) y sobrantes de obra ───
ALTER TABLE mk_ofertas ADD COLUMN IF NOT EXISTS origen TEXT DEFAULT 'CATALOGO'; -- CATALOGO | SOBRANTE
ALTER TABLE mk_ofertas ADD COLUMN IF NOT EXISTS bodega_id UUID REFERENCES bodegas(id) ON DELETE SET NULL;
ALTER TABLE mk_ofertas ADD COLUMN IF NOT EXISTS precio_liquidacion NUMERIC(15,2);
ALTER TABLE mk_ofertas ADD COLUMN IF NOT EXISTS sector TEXT; -- ej. 'Sector El Potrerillo'

-- ─── 5. PEDIDOS MARKETPLACE ───
ALTER TABLE mk_pedidos ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE mk_pedidos ADD COLUMN IF NOT EXISTS cliente_id UUID;
ALTER TABLE mk_pedidos ADD COLUMN IF NOT EXISTS comprador_nombre TEXT;
ALTER TABLE mk_pedidos ADD COLUMN IF NOT EXISTS comprador_telefono TEXT;
ALTER TABLE mk_pedidos ADD COLUMN IF NOT EXISTS comprador_email TEXT;
ALTER TABLE mk_pedidos ADD COLUMN IF NOT EXISTS direccion_entrega TEXT;
ALTER TABLE mk_pedidos ADD COLUMN IF NOT EXISTS municipio_entrega TEXT;
ALTER TABLE mk_pedidos ADD COLUMN IF NOT EXISTS tipo_entrega TEXT DEFAULT 'DESPACHO'; -- DESPACHO | RETIRO_EN_SITIO
ALTER TABLE mk_pedidos ADD COLUMN IF NOT EXISTS proveedor_id UUID;
ALTER TABLE mk_pedidos ADD COLUMN IF NOT EXISTS costo_proveedor NUMERIC(15,2) DEFAULT 0;
ALTER TABLE mk_pedidos ADD COLUMN IF NOT EXISTS metodo_pago TEXT; -- mercadopago | transferencia | qr_breb
ALTER TABLE mk_pedidos ADD COLUMN IF NOT EXISTS estado_pago TEXT DEFAULT 'pendiente'; -- pendiente | en_revision | aprobado | rechazado
ALTER TABLE mk_pedidos ADD COLUMN IF NOT EXISTS destino_contable TEXT; -- OBRA | KALARTI
ALTER TABLE mk_pedidos ADD COLUMN IF NOT EXISTS proyecto_origen_id UUID;
ALTER TABLE mk_pedidos ADD COLUMN IF NOT EXISTS notas TEXT;
SELECT kalarti_drop_checks('mk_pedidos', 'estado');
ALTER TABLE mk_pedidos ADD CONSTRAINT mk_pedidos_estado_check CHECK (estado IN (
  'PENDIENTE','CONFIRMADO','ENVIADO','ENTREGADO','CANCELADO',
  'PENDIENTE_PAGO','PENDIENTE_CONTACTO','CONFIRMADO_CON_PROVEEDOR','EN_RUTA'));

-- ─── 6. AGENDA CENTRALIZADA (pos_agenda) ───
ALTER TABLE pos_agenda ADD COLUMN IF NOT EXISTS ambito TEXT DEFAULT 'COMERCIAL'; -- OBRA | COMERCIAL
ALTER TABLE pos_agenda ADD COLUMN IF NOT EXISTS proyecto_id UUID;
ALTER TABLE pos_agenda ADD COLUMN IF NOT EXISTS bodega_id UUID;
ALTER TABLE pos_agenda ADD COLUMN IF NOT EXISTS proveedor_id UUID;
ALTER TABLE pos_agenda ADD COLUMN IF NOT EXISTS orden_compra_id UUID;
ALTER TABLE pos_agenda ADD COLUMN IF NOT EXISTS mk_pedido_id UUID;
ALTER TABLE pos_agenda ADD COLUMN IF NOT EXISTS presupuesto_item_id UUID;
ALTER TABLE pos_agenda ADD COLUMN IF NOT EXISTS responsable_id UUID;
ALTER TABLE pos_agenda ADD COLUMN IF NOT EXISTS fecha_fin TIMESTAMPTZ;
ALTER TABLE pos_agenda ADD COLUMN IF NOT EXISTS datos JSONB;
ALTER TABLE pos_agenda ALTER COLUMN tienda_id DROP NOT NULL;
ALTER TABLE pos_agenda ALTER COLUMN punto_venta_id DROP NOT NULL;
SELECT kalarti_drop_checks('pos_agenda', 'tipo');
SELECT kalarti_drop_checks('pos_agenda', 'estado');

-- ─── 7. PROVEEDORES ───
ALTER TABLE erp_proveedores ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE erp_proveedores ADD COLUMN IF NOT EXISTS cobertura_municipios TEXT[];
ALTER TABLE erp_proveedores ADD COLUMN IF NOT EXISTS tiempo_entrega_dias INTEGER DEFAULT 2;
ALTER TABLE erp_proveedores ADD COLUMN IF NOT EXISTS profile_id UUID;
UPDATE erp_proveedores SET whatsapp = regexp_replace(telefono, '\D', '', 'g') WHERE whatsapp IS NULL AND telefono IS NOT NULL;

-- ─── 8. PAGOS (MercadoPago, transferencia, QR Bre-B) ───
ALTER TABLE pagos_plataforma ADD COLUMN IF NOT EXISTS mk_pedido_id UUID;
ALTER TABLE pagos_plataforma ADD COLUMN IF NOT EXISTS comprobante_url TEXT;
ALTER TABLE pagos_plataforma ADD COLUMN IF NOT EXISTS referencia TEXT;
ALTER TABLE pagos_plataforma ALTER COLUMN user_id DROP NOT NULL;
SELECT kalarti_drop_checks('pagos_plataforma', 'producto');
SELECT kalarti_drop_checks('pagos_plataforma', 'proveedor');
SELECT kalarti_drop_checks('pagos_plataforma', 'estado');
ALTER TABLE pagos_plataforma ADD CONSTRAINT pagos_plataforma_producto_check CHECK (producto IN ('export','mensual','semestral','anual','marketplace'));
ALTER TABLE pagos_plataforma ADD CONSTRAINT pagos_plataforma_proveedor_check CHECK (proveedor IN ('mercadopago','paypal','transferencia','qr_breb'));
ALTER TABLE pagos_plataforma ADD CONSTRAINT pagos_plataforma_estado_check CHECK (estado IN ('pendiente','en_revision','aprobado','rechazado'));

-- ─── 9. PROYECTOS: cierre contable (destino del ingreso por sobrantes) ───
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS liquidado BOOLEAN DEFAULT FALSE;

-- ─── 10. IDENTIDAD UNIFICADA ───
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS documento TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ciudad TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS empresa TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS roles TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;
UPDATE profiles SET roles = ARRAY[upper(COALESCE(role, 'CLIENTE'))] WHERE roles IS NULL;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE chat_usuarios ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE chat_usuarios ADD COLUMN IF NOT EXISTS cliente_id UUID;
ALTER TABLE marketing_leads ADD COLUMN IF NOT EXISTS cliente_id UUID;
-- Enlace inicial por email
UPDATE personal pe SET profile_id = pr.id FROM profiles pr WHERE pe.profile_id IS NULL AND lower(pe.email) = lower(pr.email);
UPDATE clientes c SET profile_id = pr.id FROM profiles pr WHERE c.profile_id IS NULL AND lower(c.email) = lower(pr.email);
UPDATE chat_usuarios cu SET profile_id = pr.id FROM profiles pr WHERE cu.profile_id IS NULL AND lower(cu.email) = lower(pr.email);

-- ─── 11. VISTAS ───
-- Existencias por bodega de obra: existente, comprometido (traslados pendientes) y disponible
CREATE OR REPLACE VIEW v_stock_bodega WITH (security_invoker = true) AS
WITH mov AS (
  SELECT bodega_id, insumo_id,
    SUM(CASE WHEN tipo::text IN ('ENTRADA','TRASLADO_ENTRADA') THEN cantidad ELSE -cantidad END) AS existente,
    SUM(CASE WHEN tipo::text IN ('ENTRADA','TRASLADO_ENTRADA') THEN cantidad * COALESCE(costo_unitario, costo_real / NULLIF(cantidad, 0), 0) ELSE 0 END)
      / NULLIF(SUM(CASE WHEN tipo::text IN ('ENTRADA','TRASLADO_ENTRADA') THEN cantidad ELSE 0 END), 0) AS costo_promedio
  FROM inventario_transacciones GROUP BY bodega_id, insumo_id
), comp AS (
  SELECT oc.bodega_origen_id AS bodega_id, (it->>'insumo_id')::uuid AS insumo_id, SUM((it->>'cantidad')::numeric) AS comprometido
  FROM erp_ordenes_compra oc, jsonb_array_elements(COALESCE(oc.items, '[]'::jsonb)) it
  WHERE oc.tipo = 'TRASLADO' AND oc.estado NOT IN ('RECIBIDO','ENTREGADO','CANCELADO') AND it ? 'insumo_id'
  GROUP BY 1, 2
)
SELECT m.bodega_id, b.proyecto_id, b.municipio, m.insumo_id, i.nombre AS insumo, i.unidad,
  m.existente, COALESCE(c.comprometido, 0) AS comprometido,
  m.existente - COALESCE(c.comprometido, 0) AS disponible,
  COALESCE(m.costo_promedio, i.precio_unitario) AS costo_unitario
FROM mov m JOIN bodegas b ON b.id = m.bodega_id JOIN insumos i ON i.id = m.insumo_id
LEFT JOIN comp c ON c.bodega_id = m.bodega_id AND c.insumo_id = m.insumo_id;

-- Margen del Marketplace (comisión por intermediación)
CREATE OR REPLACE VIEW v_margen_marketplace WITH (security_invoker = true) AS
SELECT p.id, p.numero, p.created_at, p.estado, p.estado_pago, p.metodo_pago, p.comprador_nombre,
  p.total AS precio_web, COALESCE(p.costo_proveedor, 0) AS costo_proveedor,
  p.total - COALESCE(p.costo_proveedor, 0) AS comision,
  CASE WHEN p.total > 0 THEN ROUND(((p.total - COALESCE(p.costo_proveedor, 0)) / p.total) * 100, 1) END AS margen_pct
FROM mk_pedidos p;

-- ─── 12. RLS mínimas para el flujo web ───
CREATE OR REPLACE FUNCTION kalarti_es_staff() RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND upper(COALESCE(role, 'CLIENTE')) <> 'CLIENTE');
$$ LANGUAGE sql STABLE SECURITY DEFINER;
ALTER TABLE mk_pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comprador_crea_pedido" ON mk_pedidos;
CREATE POLICY "comprador_crea_pedido" ON mk_pedidos FOR INSERT TO authenticated WITH CHECK (comprador_id = auth.uid() OR kalarti_es_staff());
DROP POLICY IF EXISTS "comprador_ve_sus_pedidos" ON mk_pedidos;
CREATE POLICY "comprador_ve_sus_pedidos" ON mk_pedidos FOR SELECT TO authenticated USING (comprador_id = auth.uid() OR kalarti_es_staff());
DROP POLICY IF EXISTS "staff_actualiza_pedidos" ON mk_pedidos;
CREATE POLICY "staff_actualiza_pedidos" ON mk_pedidos FOR UPDATE TO authenticated USING (kalarti_es_staff()) WITH CHECK (kalarti_es_staff());
DROP POLICY IF EXISTS "public_read_bodegas" ON bodegas;
CREATE POLICY "public_read_bodegas" ON bodegas FOR SELECT USING (true);

-- Precios de compra: solo personal Kalarti (los clientes web también son "authenticated")
DROP POLICY IF EXISTS "staff_read_insumo_cotizaciones" ON insumo_cotizaciones;
CREATE POLICY "staff_read_insumo_cotizaciones" ON insumo_cotizaciones FOR SELECT TO authenticated USING (kalarti_es_staff());
DROP POLICY IF EXISTS "staff_write_insumo_cotizaciones" ON insumo_cotizaciones;
CREATE POLICY "staff_write_insumo_cotizaciones" ON insumo_cotizaciones FOR ALL TO authenticated USING (kalarti_es_staff()) WITH CHECK (kalarti_es_staff());

-- Datos de pago para transferencia / QR Bre-B (editar en ERP → global_config)
INSERT INTO global_config (clave, valor)
SELECT 'DATOS_PAGO', '{"banco":"(definir)","tipo_cuenta":"Ahorros","numero":"(definir)","titular":"Kalarti","nit":"(definir)","llave_breb":"(definir)","whatsapp_comprobantes":"(definir)"}'
WHERE NOT EXISTS (SELECT 1 FROM global_config WHERE clave = 'DATOS_PAGO');
INSERT INTO global_config (clave, valor)
SELECT 'FLETE_TRASLADO', '{"mismo_municipio":60000,"otro_municipio":180000}'
WHERE NOT EXISTS (SELECT 1 FROM global_config WHERE clave = 'FLETE_TRASLADO');
