-- ============================================================
-- FASE 19 — Catálogo depurado Kalarti
-- Ejecutar en Supabase → SQL Editor ANTES de `node scripts/catalogo/build-catalogo.mjs --apply`
-- Idempotente.
-- ============================================================

-- 1. Código anterior del APU (trazabilidad tras recodificación CC.NNN)
ALTER TABLE apu ADD COLUMN IF NOT EXISTS codigo_legacy TEXT;

-- 2. Cotizaciones internas de proveedores por insumo (NO visibles al público)
CREATE TABLE IF NOT EXISTS insumo_cotizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  proveedor_id UUID REFERENCES erp_proveedores(id) ON DELETE SET NULL,
  proveedor_nombre TEXT,
  precio_compra NUMERIC NOT NULL DEFAULT 0,
  stock NUMERIC,
  tiempo_entrega_dias INTEGER DEFAULT 2,
  referencia TEXT,
  fecha DATE DEFAULT CURRENT_DATE,
  vigente BOOLEAN DEFAULT TRUE,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_insumo_cot_insumo ON insumo_cotizaciones(insumo_id);
CREATE INDEX IF NOT EXISTS idx_insumo_cot_proveedor ON insumo_cotizaciones(proveedor_id);

ALTER TABLE insumo_cotizaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_insumo_cotizaciones" ON insumo_cotizaciones;
CREATE POLICY "staff_read_insumo_cotizaciones" ON insumo_cotizaciones
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "staff_write_insumo_cotizaciones" ON insumo_cotizaciones;
CREATE POLICY "staff_write_insumo_cotizaciones" ON insumo_cotizaciones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Sin política para `anon`: el Cotizador público nunca ve precios de compra.

-- 3. Configuración global legible por el Cotizador (SMLV, factor prestacional)
ALTER TABLE global_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_global_config" ON global_config;
CREATE POLICY "public_read_global_config" ON global_config FOR SELECT USING (true);

-- 4. Composición de cuadrillas legible por el Cotizador
ALTER TABLE cargo_detalle ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_cargo_detalle" ON cargo_detalle;
CREATE POLICY "public_read_cargo_detalle" ON cargo_detalle FOR SELECT USING (true);
