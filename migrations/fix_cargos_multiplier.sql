-- Script para agregar la columna factor_multiplicador a la tabla de cargos
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS factor_multiplicador numeric DEFAULT 1.0;

-- Comentario para el cache de PostgREST
COMMENT ON COLUMN cargos.factor_multiplicador IS 'Factor multiplicador para prestaciones sociales o recargos técnicos';
