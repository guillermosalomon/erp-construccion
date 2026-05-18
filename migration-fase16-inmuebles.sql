-- ============================================================
-- ERP Construcción - Migración Fase 16: Inmuebles y Marketplace
-- ============================================================

-- 1. Inmuebles
CREATE TABLE IF NOT EXISTS inmuebles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  precio DECIMAL(15,2),
  moneda TEXT DEFAULT 'COP',
  tipo TEXT DEFAULT 'Apartamento' CHECK (tipo IN ('Casa', 'Apartamento', 'Lote', 'Local', 'Oficina', 'Finca', 'Otro')),
  estado TEXT DEFAULT 'DISPONIBLE' CHECK (estado IN ('DISPONIBLE', 'VENDIDO', 'ALQUILADO', 'RESERVADO', 'PAUSADO')),
  operacion TEXT DEFAULT 'VENTA' CHECK (operacion IN ('VENTA', 'ALQUILER', 'PROYECTO')),
  area_terreno DECIMAL(10,2),
  area_construida DECIMAL(10,2),
  habitaciones INT DEFAULT 0,
  banos INT DEFAULT 0,
  parqueaderos INT DEFAULT 0,
  direccion TEXT,
  ciudad TEXT,
  departamento TEXT,
  gps_lat DECIMAL(10,8),
  gps_lng DECIMAL(11,8),
  portada_url TEXT,
  tour_360_url TEXT,
  amenidades JSONB DEFAULT '[]'::jsonb, -- ['Piscina', 'Gimnasio', 'Seguridad 24/7']
  espacios_zonas JSONB DEFAULT '{}'::jsonb, -- {'Sala': '20m2', 'Cocina': '15m2'}
  destacado BOOLEAN DEFAULT false,
  -- Datos Administrativos Internos
  propietario_nombre TEXT,
  propietario_telefono TEXT,
  propietario_email TEXT,
  comision_pct DECIMAL(5,2),
  agente_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.5 Inmuebles Leads (Contactos interesados en propiedades)
CREATE TABLE IF NOT EXISTS inmueble_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inmueble_id UUID NOT NULL REFERENCES inmuebles(id) ON DELETE CASCADE,
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT NOT NULL,
  cliente_email TEXT,
  mensaje TEXT,
  estado TEXT DEFAULT 'NUEVO' CHECK (estado IN ('NUEVO', 'CONTACTADO', 'VISITA_PROGRAMADA', 'OFERTA_REALIZADA', 'CERRADO', 'DESCARTADO')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Fotos de Inmuebles
CREATE TABLE IF NOT EXISTS inmueble_fotos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inmueble_id UUID NOT NULL REFERENCES inmuebles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  orden INT DEFAULT 0,
  tipo TEXT DEFAULT 'FOTO' CHECK (tipo IN ('FOTO', 'PLANO', '360', 'VIDEO')),
  descripcion TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Políticas RLS
ALTER TABLE inmuebles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inmueble_fotos ENABLE ROW LEVEL SECURITY;

-- Políticas para inmuebles
-- Lectura pública (Marketplace)
DROP POLICY IF EXISTS "Lectura pública de inmuebles" ON inmuebles;
CREATE POLICY "Lectura pública de inmuebles" 
  ON inmuebles FOR SELECT 
  USING (estado = 'DISPONIBLE');

-- Acceso total para usuarios autenticados (ERP)
DROP POLICY IF EXISTS "Acceso total inmuebles autenticados" ON inmuebles;
CREATE POLICY "Acceso total inmuebles autenticados" 
  ON inmuebles FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

-- Políticas para fotos
-- Lectura pública (Marketplace)
DROP POLICY IF EXISTS "Lectura pública de fotos" ON inmueble_fotos;
CREATE POLICY "Lectura pública de fotos" 
  ON inmueble_fotos FOR SELECT 
  USING (EXISTS (SELECT 1 FROM inmuebles WHERE id = inmueble_fotos.inmueble_id AND estado = 'DISPONIBLE'));

-- Acceso total para usuarios autenticados (ERP)
DROP POLICY IF EXISTS "Acceso total fotos autenticadas" ON inmueble_fotos;
CREATE POLICY "Acceso total fotos autenticadas" 
  ON inmueble_fotos FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

-- Políticas para leads
ALTER TABLE inmueble_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso total leads autenticados" ON inmueble_leads;
CREATE POLICY "Acceso total leads autenticados" 
  ON inmueble_leads FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);
  
DROP POLICY IF EXISTS "Insert public leads" ON inmueble_leads;
CREATE POLICY "Insert public leads" 
  ON inmueble_leads FOR INSERT 
  WITH CHECK (true);
