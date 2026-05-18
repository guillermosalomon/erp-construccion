-- MIGRACIÓN: Vincular Chat con Proyectos
-- Ejecutar en Supabase Dashboard -> SQL Editor

ALTER TABLE chat_usuarios ADD COLUMN IF NOT EXISTS proyecto_id UUID REFERENCES proyectos(id);

-- Opcional: Permitir que los mensajes también tengan un vínculo directo (denormalización para velocidad)
ALTER TABLE chat_mensajes ADD COLUMN IF NOT EXISTS presupuesto_item_id UUID REFERENCES presupuesto_items(id);

-- Tabla de Agenda de Proyecto
CREATE TABLE IF NOT EXISTS proyecto_agenda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE,
    presupuesto_item_id UUID REFERENCES presupuesto_items(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    fecha_programada TIMESTAMPTZ,
    prioridad TEXT CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'completado', 'cancelado')),
    created_at TIMESTAMPTZ DEFAULT now()
);
