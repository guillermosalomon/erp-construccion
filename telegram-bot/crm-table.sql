-- Ejecutar en Supabase SQL Editor
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    empresa TEXT,
    nit TEXT,
    email TEXT,
    telefono TEXT,
    whatsapp TEXT,
    telegram_id TEXT,
    direccion TEXT,
    ciudad TEXT,
    notas TEXT,
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo','inactivo','prospecto')),
    origen TEXT DEFAULT 'manual' CHECK (origen IN ('manual','telegram','whatsapp','web','referido')),
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access" ON clientes FOR ALL USING (true) WITH CHECK (true);
