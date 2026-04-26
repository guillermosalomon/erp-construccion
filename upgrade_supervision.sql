-- ============================================================
-- 🛠️ MIGRACIÓN: SUPERVISIÓN TÉCNICA Y HILOS DE COLABORACIÓN
-- Implementa pesos de checklist, estados de aprobación y threads
-- ============================================================

-- 1. ACTUALIZAR TABLA DE CHECKLIST
ALTER TABLE item_checklist_items 
ADD COLUMN IF NOT EXISTS porcentaje_peso NUMERIC DEFAULT 0;

ALTER TABLE item_checklist_items 
ADD COLUMN IF NOT EXISTS estado_aprobacion TEXT DEFAULT 'PENDIENTE'; 
-- PENDIENTE: Nadie ha reportado cumplimiento
-- SOLICITADO: Trabajador reportó pero falta firma supervisor
-- APROBADO: Supervisor validó y cuenta para el progreso
-- RECHAZADO: Supervisor rechazó; no aparece en checklist pero sí en historial

ALTER TABLE item_checklist_items 
ADD COLUMN IF NOT EXISTS porcentaje_avance NUMERIC DEFAULT 0;
-- Porcentaje de ejecución del ítem (0-100%), independiente del peso

-- 2. ACTUALIZAR TABLA DE NOTAS PARA HILOS (THREADS)
ALTER TABLE item_notes 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES item_notes(id) ON DELETE CASCADE;

-- 3. ACTUALIZAR TABLA DE NOTAS PARA VINCULAR A CHECKLIST
ALTER TABLE item_notes 
ADD COLUMN IF NOT EXISTS checklist_item_id UUID REFERENCES item_checklist_items(id) ON DELETE CASCADE;

-- 4. ACTUALIZAR AVANCES (Opcional, para mayor trazabilidad)
ALTER TABLE obra_avances 
ADD COLUMN IF NOT EXISTS checklist_item_id UUID REFERENCES item_checklist_items(id) ON DELETE SET NULL;

-- 5. ELIMINAR RESTRICCIÓN DE STATUS EN NOTAS (permite estados flexibles)
ALTER TABLE item_notes DROP CONSTRAINT IF EXISTS item_notes_status_check;

-- 6. REFRESCAR POLÍTICAS RLS
COMMENT ON COLUMN item_checklist_items.porcentaje_peso IS 'Peso del ítem sobre el 100% de la actividad';
COMMENT ON COLUMN item_checklist_items.porcentaje_avance IS 'Porcentaje de ejecución del ítem (0-100%)';
COMMENT ON COLUMN item_notes.parent_id IS 'ID de la nota padre para hilos de conversación';

-- Fin de migración
