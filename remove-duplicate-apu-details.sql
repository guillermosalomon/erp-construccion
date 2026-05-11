-- Eliminar detalles de APU duplicados (mantener el más reciente o uno solo)
DELETE FROM apu_detalle WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER(PARTITION BY apu_id, insumo_id, cargo_id ORDER BY id) as rn
    FROM apu_detalle
  ) t WHERE t.rn > 1
);
