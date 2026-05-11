-- ============================================================
-- Migración Fase 15: Tracking de Precios y Enlaces de Productos
-- Añadir campos para proyecciones de inflación y URLs externas.
-- ============================================================

ALTER TABLE mk_ofertas 
ADD COLUMN IF NOT EXISTS fecha_actualizacion_precio TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS enlace_producto TEXT;

-- Histórico de precios para proyecciones de inflación (opcional pero recomendado)
CREATE TABLE IF NOT EXISTS mk_ofertas_historial_precios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  oferta_id UUID NOT NULL REFERENCES mk_ofertas(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  precio_anterior DECIMAL(15,2) NOT NULL,
  precio_nuevo DECIMAL(15,2) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para el historial
ALTER TABLE mk_ofertas_historial_precios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own mk_ofertas_historial_precios" ON mk_ofertas_historial_precios FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can insert mk_ofertas_historial_precios" ON mk_ofertas_historial_precios FOR INSERT WITH CHECK (auth.uid() = user_id);
