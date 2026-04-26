-- Agregar columna cuadrilla_idx a personal_proyecto
-- Permite diferenciar a qué cuadrilla (0, 1, 2...) pertenece cada asignación
ALTER TABLE personal_proyecto 
ADD COLUMN IF NOT EXISTS cuadrilla_idx integer DEFAULT 0;

-- Comentario descriptivo
COMMENT ON COLUMN personal_proyecto.cuadrilla_idx IS 'Índice de cuadrilla (0-based). 0 = primera cuadrilla, 1 = segunda, etc.';
