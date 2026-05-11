-- Añadir campos adicionales a la tabla insumos para soportar mayor detalle en POS
ALTER TABLE insumos 
ADD COLUMN IF NOT EXISTS marca TEXT,
ADD COLUMN IF NOT EXISTS id_unspsc TEXT,
ADD COLUMN IF NOT EXISTS codigo_propio TEXT,
ADD COLUMN IF NOT EXISTS ficha_tecnica TEXT;

-- Notificar recarga de cache
NOTIFY pgrst, 'reload schema';
