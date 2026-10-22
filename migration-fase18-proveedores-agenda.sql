-- ============================================================
-- FASE 18 · PROVEEDORES COMPARTIDOS, COMPRAS PROGRAMADAS Y AGENDA POS
-- Ejecutar en Supabase → SQL Editor (idempotente).
-- ============================================================

-- ─── 1. Tabla de Proveedores (Compartida entre Comercio y Proyectos) ───
CREATE TABLE IF NOT EXISTS erp_proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  nit TEXT,
  telefono TEXT,
  email TEXT,
  ciudad TEXT DEFAULT 'Pasto (Nariño)',
  direccion TEXT,
  enlace_web TEXT,
  contacto TEXT,
  calificacion NUMERIC DEFAULT 5.0,
  categorias TEXT[] DEFAULT '{}',
  activo BOOLEAN DEFAULT true,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE erp_proveedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_proveedores_read" ON erp_proveedores;
DROP POLICY IF EXISTS "erp_proveedores_write" ON erp_proveedores;
CREATE POLICY "erp_proveedores_read" ON erp_proveedores FOR SELECT USING (true);
CREATE POLICY "erp_proveedores_write" ON erp_proveedores FOR ALL USING (true) WITH CHECK (true);

-- ─── 2. Tabla de Órdenes de Compra Programadas por Fecha ───
CREATE TABLE IF NOT EXISTS erp_ordenes_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_orden TEXT,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL,
  tienda_id UUID REFERENCES mk_tiendas(id) ON DELETE SET NULL,
  punto_venta_id UUID REFERENCES mk_puntos_venta(id) ON DELETE SET NULL,
  proveedor_id UUID REFERENCES erp_proveedores(id) ON DELETE SET NULL,
  proveedor_nombre TEXT NOT NULL,
  fecha_programada DATE NOT NULL,
  fecha_entrega_esperada DATE,
  estado TEXT DEFAULT 'pendiente', -- 'pendiente', 'confirmada', 'despachada', 'entregada', 'cancelada'
  items JSONB DEFAULT '[]'::jsonb, -- [{ insumo_id, insumo_nombre, cantidad, precio_compra, total }]
  total NUMERIC DEFAULT 0,
  notas TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE erp_ordenes_compra ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "erp_ordenes_compra_read" ON erp_ordenes_compra;
DROP POLICY IF EXISTS "erp_ordenes_compra_write" ON erp_ordenes_compra;
CREATE POLICY "erp_ordenes_compra_read" ON erp_ordenes_compra FOR SELECT USING (true);
CREATE POLICY "erp_ordenes_compra_write" ON erp_ordenes_compra FOR ALL USING (true) WITH CHECK (true);

-- ─── 3. Tabla de Agenda para Puntos de Venta (POS) ───
CREATE TABLE IF NOT EXISTS pos_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tienda_id UUID REFERENCES mk_tiendas(id) ON DELETE SET NULL,
  punto_venta_id UUID REFERENCES mk_puntos_venta(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT DEFAULT 'entrega_cliente', -- 'entrega_cliente', 'recepcion_proveedor', 'reposicion_stock', 'visita_obra'
  fecha_programada TIMESTAMPTZ NOT NULL,
  prioridad TEXT DEFAULT 'media', -- 'baja', 'media', 'alta', 'critica'
  estado TEXT DEFAULT 'pendiente', -- 'pendiente', 'en_camino', 'completado', 'cancelado'
  relacion_id UUID, -- id de orden de compra, pedido o presupuesto
  contacto_nombre TEXT,
  contacto_telefono TEXT,
  direccion TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pos_agenda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pos_agenda_read" ON pos_agenda;
DROP POLICY IF EXISTS "pos_agenda_write" ON pos_agenda;
CREATE POLICY "pos_agenda_read" ON pos_agenda FOR SELECT USING (true);
CREATE POLICY "pos_agenda_write" ON pos_agenda FOR ALL USING (true) WITH CHECK (true);
