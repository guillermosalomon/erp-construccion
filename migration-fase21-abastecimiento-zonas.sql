-- ============================================================================
-- FASE 21 — Abastecimiento, Bodega de Obra, Categorías Dinámicas, Zonas y Cotizador
-- Ejecutar en el SQL Editor de Supabase. Es idempotente (se puede repetir).
--
-- Incluye:
--   1. inventario_transacciones: cuadrilla_id y personal_id (+ regla: CONSUMO exige cuadrilla)
--   2. Vista v_abastecimiento_proyecto: cobertura por bodega/insumo
--        total_abastecido = existente + en_transito + consumido (consumo imputado a partidas)
--   3. global_config.MO_ZONAS: factor de mano de obra por municipio (+ excepciones por cargo)
--   4. categorias: columnas aplica_a ('APU'|'INSUMO'|'AMBOS'), activa (BOOLEAN), orden (INTEGER)
--        + alta de CARPINTERÍA METÁLICA y VENTANERÍA Y VIDRIOS
--   5. apu + vista v_cotizador_apus + trigger de recálculo/actualización por insumo o cargo
-- ============================================================================

-- 1. CONSUMOS CON CUADRILLA RESPONSABLE ---------------------------------------
ALTER TABLE inventario_transacciones ADD COLUMN IF NOT EXISTS cuadrilla_id UUID REFERENCES cargos(id) ON DELETE SET NULL;
ALTER TABLE inventario_transacciones ADD COLUMN IF NOT EXISTS personal_id UUID;
CREATE INDEX IF NOT EXISTS idx_invtx_cuadrilla ON inventario_transacciones(cuadrilla_id);

-- Todo CONSUMO (avance de obra) debe indicar la cuadrilla; los AJUSTES (mermas, roturas, conteo) no.
-- NOT VALID: no bloquea los consumos históricos, valida todos los nuevos registros.
ALTER TABLE inventario_transacciones DROP CONSTRAINT IF EXISTS invtx_consumo_cuadrilla;
ALTER TABLE inventario_transacciones
  ADD CONSTRAINT invtx_consumo_cuadrilla
  CHECK (tipo::text <> 'CONSUMO' OR cuadrilla_id IS NOT NULL) NOT VALID;

-- 2. COBERTURA DE ABASTECIMIENTO ---------------------------------------------
-- El consumo NO infla el faltante: lo instalado ya cubrió su requerimiento.
-- Las entradas manuales (ENTRADA / TRASLADO_ENTRADA, cualquier origen) suman a lo cubierto
-- sin depender de órdenes de compra.
CREATE OR REPLACE VIEW v_abastecimiento_proyecto WITH (security_invoker = true) AS
WITH mov AS (
  SELECT bodega_id, insumo_id,
    SUM(CASE WHEN tipo::text IN ('ENTRADA','TRASLADO_ENTRADA') THEN cantidad
             WHEN tipo::text IN ('SALIDA','TRASLADO_SALIDA','CONSUMO') THEN -cantidad ELSE 0 END) AS existente,
    SUM(CASE WHEN tipo::text = 'CONSUMO' THEN cantidad ELSE 0 END) AS consumido,
    SUM(CASE WHEN tipo::text IN ('ENTRADA','TRASLADO_ENTRADA') THEN cantidad ELSE 0 END) AS entradas
  FROM inventario_transacciones
  GROUP BY bodega_id, insumo_id
), transito AS (
  SELECT oc.bodega_destino_id AS bodega_id, (it->>'insumo_id')::uuid AS insumo_id,
         SUM((it->>'cantidad')::numeric) AS en_transito
  FROM erp_ordenes_compra oc, jsonb_array_elements(COALESCE(oc.items, '[]'::jsonb)) it
  WHERE oc.tipo IN ('ABASTECIMIENTO_OBRA', 'TRASLADO')
    AND oc.estado NOT IN ('RECIBIDO', 'ENTREGADO', 'CANCELADO')
    AND it ? 'insumo_id'
  GROUP BY 1, 2
), claves AS (
  SELECT bodega_id, insumo_id FROM mov
  UNION
  SELECT bodega_id, insumo_id FROM transito
)
SELECT b.proyecto_id, k.bodega_id, k.insumo_id, i.nombre AS insumo, i.unidad,
  COALESCE(m.existente, 0)   AS existente,
  COALESCE(t.en_transito, 0) AS en_transito,
  COALESCE(m.consumido, 0)   AS consumido,
  COALESCE(m.entradas, 0)    AS entradas,
  COALESCE(m.existente, 0) + COALESCE(t.en_transito, 0) + COALESCE(m.consumido, 0) AS total_abastecido
FROM claves k
JOIN bodegas b ON b.id = k.bodega_id
JOIN insumos i ON i.id = k.insumo_id
LEFT JOIN mov m ON m.bodega_id = k.bodega_id AND m.insumo_id = k.insumo_id
LEFT JOIN transito t ON t.bodega_id = k.bodega_id AND t.insumo_id = k.insumo_id;

-- 3. MANO DE OBRA POR ZONA ---------------------------------------------------
INSERT INTO global_config (clave, valor)
SELECT 'MO_ZONAS', '{"ricaurte":{"factor_general":1.10},"tumaco":{"factor_general":1.20}}'
WHERE NOT EXISTS (SELECT 1 FROM global_config WHERE clave = 'MO_ZONAS');

-- 4. GESTIÓN DINÁMICA DE CATEGORÍAS ------------------------------------------
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS aplica_a TEXT DEFAULT 'AMBOS';
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS activa BOOLEAN DEFAULT true;
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 100;

ALTER TABLE categorias DROP CONSTRAINT IF EXISTS categorias_aplica_a_check;
ALTER TABLE categorias ADD CONSTRAINT categorias_aplica_a_check
  CHECK (aplica_a IN ('APU', 'INSUMO', 'AMBOS'));

-- Sincronizar aplica_a, orden y activa desde la descripción cuando exista
UPDATE categorias
SET
  aplica_a = COALESCE((regexp_match(descripcion, 'AMBITO:(APU|INSUMO|AMBOS)'))[1], aplica_a, 'AMBOS'),
  orden    = COALESCE(((regexp_match(descripcion, 'ORDEN:(\d+)'))[1])::integer, orden, 100),
  activa   = CASE WHEN descripcion LIKE '%ACTIVA:false%' THEN false ELSE COALESCE(activa, true) END
WHERE descripcion IS NOT NULL;

INSERT INTO categorias (nombre, aplica_a, activa, orden, descripcion)
SELECT 'CARPINTERÍA METÁLICA', 'AMBOS', true, 175, 'AMBITO:AMBOS|ORDEN:175|ACTIVA:true'
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE UPPER(nombre) IN ('CARPINTERÍA METÁLICA', 'CARPINTERIA METALICA'));

INSERT INTO categorias (nombre, aplica_a, activa, orden, descripcion)
SELECT 'VENTANERÍA Y VIDRIOS', 'AMBOS', true, 176, 'AMBITO:AMBOS|ORDEN:176|ACTIVA:true'
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE UPPER(nombre) IN ('VENTANERÍA Y VIDRIOS', 'VENTANERIA Y VIDRIOS'));

-- 5. SINCRONIZACIÓN ERP -> COTIZADOR WEB -------------------------------------
ALTER TABLE apu ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE apu ADD COLUMN IF NOT EXISTS disponible_cotizador BOOLEAN DEFAULT true;

CREATE OR REPLACE VIEW v_cotizador_apus WITH (security_invoker = true) AS
SELECT
  a.id,
  a.codigo,
  a.nombre,
  a.descripcion,
  a.unidad,
  a.rendimiento,
  a.categoria_apu,
  a.categoria_id,
  a.activo,
  a.disponible_cotizador,
  a.updated_at
FROM apu a
WHERE COALESCE(a.activo, true) = true
  AND COALESCE(a.disponible_cotizador, true) = true;

-- Trigger que marca updated_at en los APUs afectados al cambiar el precio de un insumo o cargo
CREATE OR REPLACE FUNCTION touch_apus_por_componente() RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'insumos' THEN
    UPDATE apu SET updated_at = now()
    WHERE id IN (SELECT apu_id FROM apu_detalle WHERE insumo_id = NEW.id);
  ELSIF TG_TABLE_NAME = 'cargos' THEN
    UPDATE apu SET updated_at = now()
    WHERE id IN (
      SELECT apu_id FROM apu_detalle
      WHERE cargo_id = NEW.id
         OR cargo_id IN (SELECT cargo_padre_id FROM cargo_detalle WHERE cargo_hijo_id = NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_apu_insumo ON insumos;
CREATE TRIGGER trg_touch_apu_insumo
AFTER UPDATE OF precio_unitario ON insumos
FOR EACH ROW EXECUTE FUNCTION touch_apus_por_componente();

DROP TRIGGER IF EXISTS trg_touch_apu_cargo ON cargos;
CREATE TRIGGER trg_touch_apu_cargo
AFTER UPDATE OF precio_unitario, factor_smlv, factor_multiplicador, recargo_cop, recargo_pct ON cargos
FOR EACH ROW EXECUTE FUNCTION touch_apus_por_componente();

-- ----------------------------------------------------------------------------
-- 6. PAGOS PLATAFORMA: columnas para Webhook Mercado Pago Checkout Pro
-- ----------------------------------------------------------------------------
ALTER TABLE pagos_plataforma ADD COLUMN IF NOT EXISTS transaccion_id TEXT;
ALTER TABLE pagos_plataforma ADD COLUMN IF NOT EXISTS estado_pago TEXT;
ALTER TABLE pagos_plataforma ADD COLUMN IF NOT EXISTS metodo_pago TEXT;
ALTER TABLE pagos_plataforma ADD COLUMN IF NOT EXISTS tipo_producto TEXT;
ALTER TABLE pagos_plataforma ADD COLUMN IF NOT EXISTS referencia_id TEXT;
ALTER TABLE pagos_plataforma ADD COLUMN IF NOT EXISTS user_email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pagos_plataforma_transaccion_id
  ON pagos_plataforma(transaccion_id)
  WHERE transaccion_id IS NOT NULL;

