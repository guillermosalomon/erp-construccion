/**
 * setup-chat-tables.js — Create the chatbot tables in Supabase
 */
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://hnbssxtdagzrbedrdynn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYnNzeHRkYWd6cmJlZHJkeW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTk2NzMsImV4cCI6MjA5MTkzNTY3M30.hKyFG4CVN8H3-bbpQQUn9zPdzhPIRGaRGz_mqu50oyo'
);

async function main() {
  await supabase.auth.signInWithPassword({ 
    email: 'guillermosalomonsolarte@gmail.com', password: 'l043211?' 
  });

  // Test if tables exist by trying to select from them
  console.log('Verificando tablas del chatbot...\n');

  const tables = ['chat_usuarios', 'chat_mensajes', 'chat_cotizaciones', 'chat_estado'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
      console.log(`   → Necesitas crear esta tabla en Supabase Dashboard\n`);
    } else {
      console.log(`✅ ${table}: OK`);
    }
  }

  console.log('\n─── SQL para crear las tablas ───\n');
  console.log(`
-- Ejecutar en Supabase Dashboard → SQL Editor

-- Tabla de usuarios del chatbot
CREATE TABLE IF NOT EXISTS chat_usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    telefono TEXT UNIQUE NOT NULL,
    plataforma TEXT CHECK (plataforma IN ('whatsapp','telegram')),
    email TEXT,
    nombre TEXT,
    estado TEXT DEFAULT 'activo',
    ultimo_contacto TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Historial de conversaciones
CREATE TABLE IF NOT EXISTS chat_mensajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_usuario_id UUID REFERENCES chat_usuarios(id) ON DELETE CASCADE,
    direccion TEXT CHECK (direccion IN ('in','out')),
    mensaje TEXT,
    tipo TEXT DEFAULT 'texto',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Cotizaciones generadas por el chatbot
CREATE TABLE IF NOT EXISTS chat_cotizaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_usuario_id UUID REFERENCES chat_usuarios(id) ON DELETE CASCADE,
    proyecto_nombre TEXT,
    items JSONB,
    total NUMERIC,
    estado TEXT DEFAULT 'borrador',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Estado de conversación
CREATE TABLE IF NOT EXISTS chat_estado (
    chat_usuario_id UUID PRIMARY KEY REFERENCES chat_usuarios(id) ON DELETE CASCADE,
    flujo_actual TEXT,
    paso INTEGER DEFAULT 0,
    data_temp JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies (permitir acceso con el usuario autenticado)
ALTER TABLE chat_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_estado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access for authenticated" ON chat_usuarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for authenticated" ON chat_mensajes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for authenticated" ON chat_cotizaciones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for authenticated" ON chat_estado FOR ALL USING (true) WITH CHECK (true);

-- Indices
CREATE INDEX IF NOT EXISTS idx_chat_usuarios_telefono ON chat_usuarios(telefono);
CREATE INDEX IF NOT EXISTS idx_chat_mensajes_usuario ON chat_mensajes(chat_usuario_id);
CREATE INDEX IF NOT EXISTS idx_chat_cotizaciones_usuario ON chat_cotizaciones(chat_usuario_id);
  `.trim());
}

main().catch(e => console.error('Fatal:', e));
