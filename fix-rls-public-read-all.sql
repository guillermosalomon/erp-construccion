-- ============================================================
-- FIX RLS: Permitir lectura pública a todas las tablas del ERP
-- Ejecutar en Supabase → SQL Editor para que el ERP y Cotizador
-- muestren siempre todos los datos sin importar la sesión.
-- ============================================================

-- 1. APU y Desglose de APU
ALTER TABLE apu ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_apu" ON apu;
CREATE POLICY "public_read_apu" ON apu FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_write_apu" ON apu;
CREATE POLICY "public_write_apu" ON apu FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE apu_detalle ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_apu_detalle" ON apu_detalle;
CREATE POLICY "public_read_apu_detalle" ON apu_detalle FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_write_apu_detalle" ON apu_detalle;
CREATE POLICY "public_write_apu_detalle" ON apu_detalle FOR ALL USING (true) WITH CHECK (true);

-- 2. Insumos y Cargos
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_insumos" ON insumos;
CREATE POLICY "public_read_insumos" ON insumos FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_write_insumos" ON insumos;
CREATE POLICY "public_write_insumos" ON insumos FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_cargos" ON cargos;
CREATE POLICY "public_read_cargos" ON cargos FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_write_cargos" ON cargos;
CREATE POLICY "public_write_cargos" ON cargos FOR ALL USING (true) WITH CHECK (true);

-- 3. Proyectos y Presupuestos
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_proyectos" ON proyectos;
CREATE POLICY "public_read_proyectos" ON proyectos FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_write_proyectos" ON proyectos;
CREATE POLICY "public_write_proyectos" ON proyectos FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE presupuesto_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_presupuesto_items" ON presupuesto_items;
CREATE POLICY "public_read_presupuesto_items" ON presupuesto_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_write_presupuesto_items" ON presupuesto_items;
CREATE POLICY "public_write_presupuesto_items" ON presupuesto_items FOR ALL USING (true) WITH CHECK (true);

-- 4. Proveedores y Comercio
ALTER TABLE erp_proveedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_erp_proveedores" ON erp_proveedores;
CREATE POLICY "public_read_erp_proveedores" ON erp_proveedores FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_write_erp_proveedores" ON erp_proveedores;
CREATE POLICY "public_write_erp_proveedores" ON erp_proveedores FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE erp_ordenes_compra ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_erp_ordenes_compra" ON erp_ordenes_compra;
CREATE POLICY "public_read_erp_ordenes_compra" ON erp_ordenes_compra FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_write_erp_ordenes_compra" ON erp_ordenes_compra FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE pos_agenda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_pos_agenda" ON pos_agenda;
CREATE POLICY "public_read_pos_agenda" ON pos_agenda FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_write_pos_agenda" ON pos_agenda FOR ALL USING (true) WITH CHECK (true);

-- 5. Tiendas y Ofertas
ALTER TABLE mk_ofertas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_mk_ofertas" ON mk_ofertas;
CREATE POLICY "public_read_mk_ofertas" ON mk_ofertas FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_write_mk_ofertas" ON mk_ofertas;
CREATE POLICY "public_write_mk_ofertas" ON mk_ofertas FOR ALL USING (true) WITH CHECK (true);
