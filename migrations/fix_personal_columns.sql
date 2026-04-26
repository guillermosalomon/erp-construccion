-- ============================================================
-- MIGRACIÓN MASIVA: Estructura Completa de Tabla Personal
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Asegurar todas las columnas necesarias si no existen
ALTER TABLE personal ADD COLUMN IF NOT EXISTS nombres TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS apellidos TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS cedula TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS tp_numero TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS cedula_url TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS tp_url TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS unidad_pago TEXT DEFAULT 'Mes';
ALTER TABLE personal ADD COLUMN IF NOT EXISTS salario_base DECIMAL(15,2) DEFAULT 0;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS rol_proyecto TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS app_role TEXT DEFAULT 'cuadrilla';

-- 2. Migración de Datos de Emergencia
-- Si 'nombres' está vacío, intentar recuperar desde el campo antiguo 'nombre'
UPDATE personal 
SET nombres = split_part(nombre, ' ', 1),
    apellidos = substring(nombre from position(' ' in nombre) + 1)
WHERE (nombres IS NULL OR nombres = '') AND (nombre IS NOT NULL AND nombre != '');

-- 3. Documentación
COMMENT ON TABLE personal IS 'Tabla central de personal con soporte para perfiles profesionales completos y documentos soporte.';
COMMENT ON COLUMN personal.nombre IS 'DEPRECATED: Use nombres + apellidos';

-- 4. Asegurar RLS
ALTER TABLE personal ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. TABLA: personal_proyecto (Asignaciones de Personal a Proyectos)
-- ============================================================
CREATE TABLE IF NOT EXISTS personal_proyecto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id UUID REFERENCES personal(id) ON DELETE CASCADE,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE,
  cargo_id UUID REFERENCES cargos(id) ON DELETE SET NULL,
  unidades_asignadas NUMERIC DEFAULT 1,
  salario_pactado DECIMAL(15,2) DEFAULT 0,
  unidad_pactada TEXT DEFAULT 'Mes',
  tareas_asignadas JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE personal_proyecto ENABLE ROW LEVEL SECURITY;

-- Política de acceso (permitir todo para usuarios autenticados)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'personal_proyecto' AND policyname = 'personal_proyecto_all'
  ) THEN
    CREATE POLICY personal_proyecto_all ON personal_proyecto FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
