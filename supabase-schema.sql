-- ============================================================
-- ERP Construcción — Esquema de Base de Datos (Fase 4)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Categorías (jerárquicas)
CREATE TABLE IF NOT EXISTS categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  padre_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Insumos (materiales, mano de obra, equipos, transporte)
CREATE TYPE tipo_insumo AS ENUM ('MATERIAL', 'MANO_OBRA', 'EQUIPO', 'TRANSPORTE');

CREATE TABLE IF NOT EXISTS insumos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  tipo tipo_insumo NOT NULL DEFAULT 'MATERIAL',
  unidad TEXT NOT NULL DEFAULT 'un',
  precio_unitario DECIMAL(15,2) NOT NULL DEFAULT 0,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  notas TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. APU (Análisis de Precios Unitarios)
CREATE TYPE tipo_apu AS ENUM ('BASICO', 'COMPUESTO');

CREATE TABLE IF NOT EXISTS apu (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  tipo tipo_apu NOT NULL DEFAULT 'BASICO',
  descripcion TEXT,
  unidad TEXT NOT NULL DEFAULT 'un',
  rendimiento DECIMAL(10,4) DEFAULT 1,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. APU Detalle (líneas de composición de un APU)
CREATE TABLE IF NOT EXISTS apu_detalle (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  apu_id UUID NOT NULL REFERENCES apu(id) ON DELETE CASCADE,
  insumo_id UUID REFERENCES insumos(id) ON DELETE CASCADE,
  apu_hijo_id UUID REFERENCES apu(id) ON DELETE CASCADE,
  cantidad DECIMAL(12,4) NOT NULL DEFAULT 0,
  desperdicio_pct DECIMAL(5,2) DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT chk_tipo_detalle CHECK (
    (insumo_id IS NOT NULL AND apu_hijo_id IS NULL) OR
    (insumo_id IS NULL AND apu_hijo_id IS NOT NULL)
  ),
  CONSTRAINT chk_no_self_ref CHECK (apu_id != apu_hijo_id)
);

-- 5. Proyectos (con AIU y código automático)
CREATE TABLE IF NOT EXISTS proyectos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  cliente TEXT,
  ubicacion TEXT,
  estado TEXT DEFAULT 'PLANEACION' CHECK (estado IN ('PLANEACION', 'EJECUCION', 'FINALIZADO', 'CANCELADO')),
  fecha_inicio DATE,
  fecha_fin DATE,
  notas TEXT,
  aiu_admin DECIMAL(5,2) DEFAULT 10,
  aiu_imprev DECIMAL(5,2) DEFAULT 5,
  aiu_utilidad DECIMAL(5,2) DEFAULT 5,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Presupuesto Items (con capítulo)
CREATE TABLE IF NOT EXISTS presupuesto_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  apu_id UUID NOT NULL REFERENCES apu(id) ON DELETE CASCADE,
  cantidad DECIMAL(12,4) NOT NULL DEFAULT 0,
  descripcion TEXT,
  capitulo TEXT,
  orden INT DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Índices para rendimiento
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_insumos_tipo ON insumos(tipo);
CREATE INDEX IF NOT EXISTS idx_insumos_categoria ON insumos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_insumos_user ON insumos(user_id);
CREATE INDEX IF NOT EXISTS idx_apu_tipo ON apu(tipo);
CREATE INDEX IF NOT EXISTS idx_apu_categoria ON apu(categoria_id);
CREATE INDEX IF NOT EXISTS idx_apu_user ON apu(user_id);
CREATE INDEX IF NOT EXISTS idx_apu_detalle_apu ON apu_detalle(apu_id);
CREATE INDEX IF NOT EXISTS idx_apu_detalle_insumo ON apu_detalle(insumo_id);
CREATE INDEX IF NOT EXISTS idx_apu_detalle_hijo ON apu_detalle(apu_hijo_id);
CREATE INDEX IF NOT EXISTS idx_presupuesto_proyecto ON presupuesto_items(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_presupuesto_user ON presupuesto_items(user_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_user ON proyectos(user_id);

-- ============================================================
-- Función para calcular el costo total de un APU (recursiva)
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_costo_apu(p_apu_id UUID)
RETURNS DECIMAL(15,2) AS $$
DECLARE
  total DECIMAL(15,2) := 0;
  detalle RECORD;
BEGIN
  FOR detalle IN
    SELECT d.cantidad, d.desperdicio_pct, d.insumo_id, d.apu_hijo_id
    FROM apu_detalle d
    WHERE d.apu_id = p_apu_id
  LOOP
    IF detalle.insumo_id IS NOT NULL THEN
      total := total + (
        detalle.cantidad * (1 + COALESCE(detalle.desperdicio_pct, 0) / 100) *
        (SELECT COALESCE(precio_unitario, 0) FROM insumos WHERE id = detalle.insumo_id)
      );
    ELSIF detalle.apu_hijo_id IS NOT NULL THEN
      total := total + (
        detalle.cantidad * (1 + COALESCE(detalle.desperdicio_pct, 0) / 100) *
        calcular_costo_apu(detalle.apu_hijo_id)
      );
    END IF;
  END LOOP;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RLS (Row Level Security) — cada usuario ve solo sus datos
-- ============================================================
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE apu ENABLE ROW LEVEL SECURITY;
ALTER TABLE apu_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuesto_items ENABLE ROW LEVEL SECURITY;

-- Policies: usuario puede CRUD sus propios datos
CREATE POLICY "Users can manage own categorias" ON categorias FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own insumos" ON insumos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own apu" ON apu FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own apu_detalle" ON apu_detalle FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own proyectos" ON proyectos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own presupuesto_items" ON presupuesto_items FOR ALL USING (auth.uid() = user_id);

-- Allow insert for authenticated users
CREATE POLICY "Users can insert categorias" ON categorias FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert insumos" ON insumos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert apu" ON apu FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert apu_detalle" ON apu_detalle FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert proyectos" ON proyectos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert presupuesto_items" ON presupuesto_items FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Nuevas tablas incorporadas para Gestión de Obra
-- ============================================================

-- 7. Bodegas
CREATE TABLE IF NOT EXISTS bodegas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Inventario Transacciones
CREATE TYPE tipo_movimiento AS ENUM ('ENTRADA', 'SALIDA');

CREATE TABLE IF NOT EXISTS inventario_transacciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bodega_id UUID NOT NULL REFERENCES bodegas(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  presupuesto_item_id UUID REFERENCES presupuesto_items(id) ON DELETE SET NULL,
  tipo tipo_movimiento NOT NULL,
  cantidad DECIMAL(12,4) NOT NULL,
  motivo TEXT,
  distribuidor TEXT,
  costo_real DECIMAL(15,2),
  comprobante_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Pagos Cliente
CREATE TABLE IF NOT EXISTS pagos_cliente (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  valor_bruto DECIMAL(15,2) NOT NULL,
  iva DECIMAL(15,2) DEFAULT 0,
  retencion_garantia DECIMAL(15,2) DEFAULT 0,
  valor_neto DECIMAL(15,2) NOT NULL,
  fecha DATE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Obra Avances
CREATE TABLE IF NOT EXISTS obra_avances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  presupuesto_item_id UUID NOT NULL REFERENCES presupuesto_items(id) ON DELETE CASCADE,
  cantidad_incremental DECIMAL(12,4) NOT NULL,
  fecha DATE NOT NULL,
  comentario TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. BIM Links
CREATE TABLE IF NOT EXISTS bim_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  presupuesto_item_id UUID NOT NULL REFERENCES presupuesto_items(id) ON DELETE CASCADE,
  element_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Item Notes
CREATE TABLE IF NOT EXISTS item_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  presupuesto_item_id UUID NOT NULL REFERENCES presupuesto_items(id) ON DELETE CASCADE,
  content TEXT,       -- deprecated, migrating to texto
  texto TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'Recibido',
  assigned_to TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Migración temporal si la tabla ya existía
ALTER TABLE item_notes ADD COLUMN IF NOT EXISTS texto TEXT;
ALTER TABLE item_notes ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE item_notes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Recibido';
ALTER TABLE item_notes ADD COLUMN IF NOT EXISTS assigned_to TEXT;

-- RLS adicionales
ALTER TABLE bodegas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_avances ENABLE ROW LEVEL SECURITY;
ALTER TABLE bim_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own bodegas" ON bodegas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own inventario_transacciones" ON inventario_transacciones FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own pagos_cliente" ON pagos_cliente FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own obra_avances" ON obra_avances FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own bim_links" ON bim_links FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own item_notes" ON item_notes FOR ALL USING (auth.uid() = author_id);

CREATE POLICY "Users can insert bodegas" ON bodegas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert inventario_transacciones" ON inventario_transacciones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert pagos_cliente" ON pagos_cliente FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert obra_avances" ON obra_avances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert bim_links" ON bim_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert item_notes" ON item_notes FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Para evitar que fallen instancias viejas que ya ejecutaron el script, añadimos esto temporalmente:
ALTER TABLE inventario_transacciones ADD COLUMN IF NOT EXISTS comprobante_url TEXT;

-- Fase 8: Nómina y Cronograma
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS salario_mensual DECIMAL(15,2);
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS rol TEXT;
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS unidad_pago TEXT DEFAULT 'Mes';
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS responsable_email TEXT;
ALTER TABLE presupuesto_items ADD COLUMN IF NOT EXISTS fecha_inicio DATE;
ALTER TABLE presupuesto_items ADD COLUMN IF NOT EXISTS fecha_fin DATE;
ALTER TABLE presupuesto_items ADD COLUMN IF NOT EXISTS num_cuadrillas INTEGER DEFAULT 1;
ALTER TABLE presupuesto_items ADD COLUMN IF NOT EXISTS asignado_a_cuadrilla TEXT;

-- Fase 12: Independización de Mano de Obra (Personal y Cargos)
CREATE TABLE IF NOT EXISTS cargos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  unidad TEXT NOT NULL DEFAULT 'hr',
  precio_unitario DECIMAL(15,2) NOT NULL DEFAULT 0,
  factor_smlv DECIMAL(10,4) DEFAULT 1,
  recargo_cop DECIMAL(15,2) DEFAULT 0,
  recargo_pct DECIMAL(5,2) DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria TEXT, -- Oficina (Escritorio), Campo (Móvil), Mano de Obra Directa
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla para composición de equipos (Cuadrillas)
CREATE TABLE IF NOT EXISTS cargo_detalle (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cargo_padre_id UUID NOT NULL REFERENCES cargos(id) ON DELETE CASCADE,
  cargo_hijo_id UUID NOT NULL REFERENCES cargos(id) ON DELETE CASCADE,
  cantidad DECIMAL(12,4) NOT NULL DEFAULT 1,
  factor_smlv double precision,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_no_self_ref_cargo CHECK (cargo_padre_id != cargo_hijo_id)
);

ALTER TABLE cargo_detalle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own cargo_detalle" ON cargo_detalle FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can insert cargo_detalle" ON cargo_detalle FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Migración de Roles Unificados
-- Nota: Esto se ejecutará si se limpia la base o se usa como referencia de Seed
-- INSERT INTO cargos (codigo, nombre, categoria, factor_smlv, unidad) VALUES 
-- ('ADM-001', 'Administrador', 'Oficina (Escritorio)', 3.5, 'Mes'),
-- ('DIR-001', 'Director de Proyectos', 'Oficina (Escritorio)', 8.0, 'Mes'),
-- ('FIN-001', 'Dir Financiero', 'Oficina (Escritorio)', 6.0, 'Mes'),
-- ('CON-001', 'Contabilidad', 'Oficina (Escritorio)', 4.0, 'Mes'),
-- ('GER-001', 'Gerencia', 'Campo (Móvil)', 10.0, 'Mes'),
-- ('INT-001', 'Interventor', 'Campo (Móvil)', 8.0, 'Mes'),
-- ('RES-001', 'Ing. Residente', 'Campo (Móvil)', 4.5, 'Mes'),
-- ('RES-002', 'Arq. Residente', 'Campo (Móvil)', 4.5, 'Mes'),
-- ('PRA-001', 'Practicante', 'Campo (Móvil)', 1.0, 'Mes'),
-- ('ALM-001', 'Almacén (Bodega)', 'Campo (Móvil)', 1.5, 'Mes');

ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own cargos" ON cargos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can insert cargos" ON cargos FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS personal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT, -- Deprecated, use nombres + apellidos
  nombres TEXT,
  apellidos TEXT,
  profesion TEXT,
  cedula TEXT,
  tp_numero TEXT,
  foto_url TEXT,
  cedula_url TEXT,
  tp_url TEXT,
  email TEXT UNIQUE,
  cargo_id UUID REFERENCES cargos(id) ON DELETE SET NULL,
  unidad_pago TEXT DEFAULT 'Mes',
  salario_base DECIMAL(15,2) DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE personal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own personal" ON personal FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can insert personal" ON personal FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tabla de Enlace: Personal <-> Proyecto (Asignaciones)
CREATE TABLE IF NOT EXISTS personal_proyecto (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID NOT NULL REFERENCES personal(id) ON DELETE CASCADE,
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  cargo_id UUID REFERENCES cargos(id) ON DELETE SET NULL,
  unidades_asignadas DECIMAL(12,4) DEFAULT 1,
  salario_pactado DECIMAL(15,2), -- Sueldo específico para esta obra
  unidad_pactada TEXT, -- Mes, Día, Hora
  tareas_asignadas JSONB DEFAULT '[]', -- Lista de IDs de presupuesto_items
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE personal_proyecto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own personal_proyecto" ON personal_proyecto FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can insert personal_proyecto" ON personal_proyecto FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fase 13: Configuración Global y Cálculo SMLV
CREATE TABLE IF NOT EXISTS global_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clave TEXT UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE global_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own config" ON global_config FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can insert config" ON global_config FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE cargos ADD COLUMN IF NOT EXISTS factor_smlv DECIMAL(10,4) DEFAULT 1;

-- Actualizar función de cálculo de costo APU para ser más robusta
-- Actualizar función de cálculo de costo APU para manejar CUADRILLAS (recursividad en cargos)
CREATE OR REPLACE FUNCTION calcular_costo_cargo(p_cargo_id UUID)
RETURNS TABLE (costo_base DECIMAL(15,2), factor_smlv DECIMAL(10,4)) AS $$
DECLARE
  v_base DECIMAL(15,2) := 0;
  v_factor DECIMAL(10,4) := 0;
  v_count INTEGER := 0;
  v_recargo_cop DECIMAL(15,2);
  v_recargo_pct DECIMAL(5,2);
  v_manual_precio DECIMAL(15,2);
  v_manual_factor DECIMAL(10,4);
  detalle RECORD;
  sub_cargo RECORD;
BEGIN
  -- Obtener datos del cargo actual
  SELECT precio_unitario, factor_smlv, recargo_cop, recargo_pct 
  INTO v_manual_precio, v_manual_factor, v_recargo_cop, v_recargo_pct
  FROM cargos WHERE id = p_cargo_id;

  -- Ver si tiene integrantes
  v_count := 0;
  FOR detalle IN SELECT cargo_hijo_id, cantidad FROM cargo_detalle WHERE cargo_padre_id = p_cargo_id LOOP
    SELECT * INTO sub_cargo FROM calcular_costo_cargo(detalle.cargo_hijo_id);
    v_base := v_base + (sub_cargo.costo_base * detalle.cantidad);
    v_factor := v_factor + sub_cargo.factor_smlv;
    v_count := v_count + 1;
  END LOOP;

  IF v_count > 0 THEN
    -- Es una cuadrilla: calcular promedio de SMLV y aplicar recargos
    v_factor := v_factor / v_count;
    v_base := v_base + COALESCE(v_recargo_cop, 0) + (v_base * COALESCE(v_recargo_pct, 0) / 100);
    RETURN NEXT (v_base, v_factor);
  ELSE
    -- Es un cargo individual
    RETURN NEXT (v_manual_precio, v_manual_factor);
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calcular_costo_apu(p_apu_id UUID)
RETURNS DECIMAL(15,2) AS $$
DECLARE
  total DECIMAL(15,2) := 0;
  detalle RECORD;
  v_cargo_data RECORD;
BEGIN
  FOR detalle IN
    SELECT d.cantidad, d.desperdicio_pct, d.insumo_id, d.cargo_id, d.apu_hijo_id
    FROM apu_detalle d
    WHERE d.apu_id = p_apu_id
  LOOP
    IF detalle.insumo_id IS NOT NULL THEN
      total := total + (
        detalle.cantidad * (1 + COALESCE(detalle.desperdicio_pct, 0) / 100) *
        (SELECT COALESCE(precio_unitario, 0) FROM insumos WHERE id = detalle.insumo_id)
      );
    ELSIF detalle.cargo_id IS NOT NULL THEN
      -- Usar la nueva función recursiva para cargos/cuadrillas
      SELECT costo_base INTO v_cargo_data FROM calcular_costo_cargo(detalle.cargo_id);
      total := total + (
        detalle.cantidad * (1 + COALESCE(detalle.desperdicio_pct, 0) / 100) *
        COALESCE(v_cargo_data.costo_base, 0)
      );
    ELSIF detalle.apu_hijo_id IS NOT NULL THEN
      total := total + (
        detalle.cantidad * (1 + COALESCE(detalle.desperdicio_pct, 0) / 100) *
        calcular_costo_apu(detalle.apu_hijo_id)
      );
    END IF;
  END LOOP;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;
