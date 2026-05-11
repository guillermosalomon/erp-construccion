-- Actualización de la tabla mk_pedidos para soportar POS completo (Ventas, Traspasos, Devoluciones, Ingresos)
ALTER TABLE mk_pedidos 
  ADD COLUMN IF NOT EXISTS tienda_id UUID REFERENCES mk_tiendas(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS punto_venta_id UUID REFERENCES mk_puntos_venta(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'VENTA_DIRECTA',
  ADD COLUMN IF NOT EXISTS metodo_pago TEXT,
  ADD COLUMN IF NOT EXISTS cliente_nombre TEXT,
  ADD COLUMN IF NOT EXISTS cliente_doc TEXT,
  ADD COLUMN IF NOT EXISTS iva DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS destino_id UUID,
  ADD COLUMN IF NOT EXISTS destino_tipo TEXT,
  ADD COLUMN IF NOT EXISTS motivo TEXT,
  ADD COLUMN IF NOT EXISTS metodo_ingreso TEXT,
  ADD COLUMN IF NOT EXISTS origen_id UUID,
  ADD COLUMN IF NOT EXISTS origen_nombre TEXT,
  ADD COLUMN IF NOT EXISTS proveedor TEXT;

-- Actualización de la tabla mk_ofertas
ALTER TABLE mk_ofertas
  ADD COLUMN IF NOT EXISTS precio_compra DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tipo_ingreso TEXT DEFAULT 'COMPRA';

-- Añadir índices de rendimiento para los nuevos filtros
CREATE INDEX IF NOT EXISTS idx_mk_pedidos_tienda ON mk_pedidos(tienda_id);
CREATE INDEX IF NOT EXISTS idx_mk_pedidos_pv ON mk_pedidos(punto_venta_id);
CREATE INDEX IF NOT EXISTS idx_mk_pedidos_tipo ON mk_pedidos(tipo);

-- Actualización de la tabla personal_proyecto para soportar tiendas y puntos de venta
ALTER TABLE personal_proyecto 
  ALTER COLUMN proyecto_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS tienda_id UUID REFERENCES mk_tiendas(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS punto_venta_id UUID REFERENCES mk_puntos_venta(id) ON DELETE CASCADE;

-- IMPORTANTE: Recargar el caché de esquema de Supabase para que la API detecte las nuevas columnas inmediatamente
NOTIFY pgrst, 'reload schema';
