-- Ejecutar en Supabase Dashboard → SQL Editor
-- Tabla para mapear proyectos y cuadrillas a canales de Telegram (Grupos/Temas)

CREATE TABLE IF NOT EXISTS telegram_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE,
    cuadrilla_id UUID REFERENCES cargos(id) ON DELETE CASCADE, -- Una cuadrilla es un "cargo" tipo equipo
    telegram_group_id TEXT, -- ID del grupo de Telegram (ej: -100123456789)
    telegram_topic_id TEXT, -- ID del tema (thread_id) si es un supergrupo con temas
    tipo TEXT CHECK (tipo IN ('proyecto', 'cuadrilla')),
    nombre_canal TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE telegram_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access" ON telegram_channels FOR ALL USING (true) WITH CHECK (true);

-- Agregar columna para el grupo principal en la tabla de configuración o usar una variable de entorno
-- Por ahora usaremos una variable de entorno TELEGRAM_MAIN_GROUP_ID
