-- Agregar columna de predecesor al cronograma Gantt
-- Almacena el número de ítem predecesor (ej: "1" o "1,3" para múltiples)
ALTER TABLE presupuesto_items 
ADD COLUMN IF NOT EXISTS predecesor_item_num TEXT DEFAULT NULL;

COMMENT ON COLUMN presupuesto_items.predecesor_item_num IS 'Número(s) de ítem predecesor separados por coma. Ej: 1 o 1,3';
