-- ============================================================
-- Migración Fase 14: Marketplace y Punto de Venta
-- Solo ejecutar este archivo (no el schema completo)
-- ============================================================

-- Tiendas (negocio del vendedor)
CREATE TABLE IF NOT EXISTS mk_tiendas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  telefono TEXT,
  logo_url TEXT,
  activa BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Puntos de venta (sucursales físicas)
CREATE TABLE IF NOT EXISTS mk_puntos_venta (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tienda_id UUID NOT NULL REFERENCES mk_tiendas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  horario TEXT,
  latitud DECIMAL(10,7),
  longitud DECIMAL(10,7),
  activo BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ofertas (productos publicados desde un POS, vinculados a insumos)
CREATE TABLE IF NOT EXISTS mk_ofertas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  tienda_id UUID NOT NULL REFERENCES mk_tiendas(id) ON DELETE CASCADE,
  punto_venta_id UUID NOT NULL REFERENCES mk_puntos_venta(id) ON DELETE CASCADE,
  nombre_comercial TEXT,
  tipo TEXT,
  categoria TEXT,
  unidad TEXT,
  precio_venta DECIMAL(15,2) NOT NULL,
  stock_disponible INTEGER DEFAULT 0,
  tienda_nombre TEXT,
  ciudad TEXT,
  publicado_marketplace BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pedidos del marketplace
CREATE TABLE IF NOT EXISTS mk_pedidos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comprador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  estado TEXT DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','CONFIRMADO','ENVIADO','ENTREGADO','CANCELADO')),
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  comision DECIMAL(15,2) NOT NULL DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  items JSONB DEFAULT '[]',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mk_ofertas_insumo ON mk_ofertas(insumo_id);
CREATE INDEX IF NOT EXISTS idx_mk_ofertas_tienda ON mk_ofertas(tienda_id);
CREATE INDEX IF NOT EXISTS idx_mk_ofertas_pv ON mk_ofertas(punto_venta_id);
CREATE INDEX IF NOT EXISTS idx_mk_ofertas_publicado ON mk_ofertas(publicado_marketplace) WHERE publicado_marketplace = true;
CREATE INDEX IF NOT EXISTS idx_mk_puntos_venta_tienda ON mk_puntos_venta(tienda_id);
CREATE INDEX IF NOT EXISTS idx_mk_pedidos_comprador ON mk_pedidos(comprador_id);

-- RLS
ALTER TABLE mk_tiendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mk_puntos_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE mk_ofertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mk_pedidos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own mk_tiendas" ON mk_tiendas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can insert mk_tiendas" ON mk_tiendas FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own mk_puntos_venta" ON mk_puntos_venta FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can insert mk_puntos_venta" ON mk_puntos_venta FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own mk_ofertas" ON mk_ofertas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can insert mk_ofertas" ON mk_ofertas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can read published mk_ofertas" ON mk_ofertas FOR SELECT USING (publicado_marketplace = true OR auth.uid() = user_id);

CREATE POLICY "Users can manage own mk_pedidos" ON mk_pedidos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can insert mk_pedidos" ON mk_pedidos FOR INSERT WITH CHECK (auth.uid() = user_id);
