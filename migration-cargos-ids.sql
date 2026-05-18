-- Migración: Agregar columna cargos_ids a tabla personal
-- Permite asignar múltiples cargos a una misma persona, evitando duplicaciones de perfil

ALTER TABLE personal ADD COLUMN IF NOT EXISTS cargos_ids JSONB DEFAULT '[]'::jsonb;

-- Migrar datos existentes: si ya tiene un cargo_id, incluirlo en el array
UPDATE personal 
SET cargos_ids = jsonb_build_array(cargo_id)
WHERE cargo_id IS NOT NULL 
  AND (cargos_ids IS NULL OR cargos_ids = '[]'::jsonb);

COMMENT ON COLUMN personal.cargos_ids IS 'Array de IDs de cargos asignados al profesional. El primer elemento es el cargo principal (base salarial).';

-- Migración: Agregar columna posgrados a tabla personal
-- Permite almacenar estudios académicos (Pregrado, Especialización, Maestría, Certificación)

ALTER TABLE personal ADD COLUMN IF NOT EXISTS posgrados JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN personal.posgrados IS 'Array de estudios académicos [{type: "Pregrado"|"Especialización"|"Maestría"|"Certificación", name: "nombre"}]';

-- Migración: Agregar equipo_padre_id a tabla personal_proyecto  
-- Almacena la referencia al cargo padre (equipo) al que pertenece la asignación

ALTER TABLE personal_proyecto ADD COLUMN IF NOT EXISTS equipo_padre_id UUID REFERENCES cargos(id) ON DELETE SET NULL;

COMMENT ON COLUMN personal_proyecto.equipo_padre_id IS 'ID del cargo padre (equipo/cuadrilla) al que pertenece esta asignación de personal.';
