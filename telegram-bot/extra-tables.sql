-- Ejecutar en Supabase Dashboard → SQL Editor
-- Tablas adicionales para asistencia, avances e informes

CREATE TABLE IF NOT EXISTS chat_asistencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_usuario_id UUID REFERENCES chat_usuarios(id) ON DELETE CASCADE,
    proyecto_id UUID,
    proyecto_nombre TEXT,
    tipo TEXT CHECK (tipo IN ('entrada','salida')),
    hora TIMESTAMPTZ DEFAULT now(),
    nota TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_avances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_usuario_id UUID REFERENCES chat_usuarios(id) ON DELETE CASCADE,
    proyecto_id UUID,
    proyecto_nombre TEXT,
    actividad TEXT,
    cantidad NUMERIC DEFAULT 0,
    unidad TEXT,
    nota TEXT,
    fecha TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_informes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_usuario_id UUID REFERENCES chat_usuarios(id) ON DELETE CASCADE,
    proyecto_id UUID,
    proyecto_nombre TEXT,
    contenido TEXT,
    fecha TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_asistencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_avances ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_informes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access" ON chat_asistencia FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access" ON chat_avances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access" ON chat_informes FOR ALL USING (true) WITH CHECK (true);
