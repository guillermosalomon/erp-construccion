-- ============================================================
-- Migración: Alinear tabla insumos con campos de la app
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- La app usa 'categoria' como TEXT, no como 'categoria_id' UUID
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS categoria TEXT;

-- La app puede enviar estos campos adicionales
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS foto TEXT;

-- Asegurar que las columnas de Fase 8 existan
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS salario_mensual DECIMAL(15,2);
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS rol TEXT;
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS unidad_pago TEXT DEFAULT 'Mes';
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS responsable_email TEXT;
