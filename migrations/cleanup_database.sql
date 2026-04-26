-- ============================================================
-- 🔴 RESET TOTAL + CORRECCIÓN DE ESQUEMA
-- Copiar TODO y pegar en Supabase SQL Editor → Run
-- Última actualización: 2026-04-20
-- ============================================================

-- ============================================================
-- PASO 1: CREAR TABLA QUE FALTA — profiles
-- (La app intenta escribir aquí al crear cuentas nuevas)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nombre TEXT,
  role TEXT DEFAULT 'ADMIN',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles (seguras para duplicados)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_select_own') THEN
    CREATE POLICY profiles_select_own ON profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_insert_own') THEN
    CREATE POLICY profiles_insert_own ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_update_own') THEN
    CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  -- Admin puede ver todos los perfiles (necesario para el listado de usuarios)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_select_all_auth') THEN
    CREATE POLICY profiles_select_all_auth ON profiles FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ============================================================
-- PASO 2: ASEGURAR COLUMNAS QUE PUEDEN FALTAR
-- ============================================================
ALTER TABLE personal ADD COLUMN IF NOT EXISTS profesion TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS nombres TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS apellidos TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS cedula TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS tp_numero TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS cedula_url TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS tp_url TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS unidad_pago TEXT DEFAULT 'Mes';
ALTER TABLE personal ADD COLUMN IF NOT EXISTS salario_base DECIMAL(15,2) DEFAULT 0;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS rol_proyecto TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS app_role TEXT DEFAULT 'cuadrilla';

ALTER TABLE cargos ADD COLUMN IF NOT EXISTS factor_smlv DECIMAL(10,4) DEFAULT 1;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS recargo_cop DECIMAL(15,2) DEFAULT 0;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS recargo_pct DECIMAL(5,2) DEFAULT 0;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS categoria TEXT;

ALTER TABLE presupuesto_items ADD COLUMN IF NOT EXISTS fecha_inicio DATE;
ALTER TABLE presupuesto_items ADD COLUMN IF NOT EXISTS fecha_fin DATE;
ALTER TABLE presupuesto_items ADD COLUMN IF NOT EXISTS num_cuadrillas INTEGER DEFAULT 1;
ALTER TABLE presupuesto_items ADD COLUMN IF NOT EXISTS asignado_a_cuadrilla TEXT;
ALTER TABLE presupuesto_items ADD COLUMN IF NOT EXISTS descripcion TEXT;
 
 ALTER TABLE pagos_cliente ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
 ALTER TABLE pagos_cliente ADD COLUMN IF NOT EXISTS iva DECIMAL(15,2) DEFAULT 0;
 ALTER TABLE pagos_cliente ADD COLUMN IF NOT EXISTS retencion_garantia DECIMAL(15,2) DEFAULT 0;
 ALTER TABLE pagos_cliente ADD COLUMN IF NOT EXISTS valor_neto DECIMAL(15,2);

ALTER TABLE inventario_transacciones ADD COLUMN IF NOT EXISTS comprobante_url TEXT;
ALTER TABLE inventario_transacciones ADD COLUMN IF NOT EXISTS distribuidor TEXT;
ALTER TABLE inventario_transacciones ADD COLUMN IF NOT EXISTS costo_real DECIMAL(15,2);
ALTER TABLE inventario_transacciones ADD COLUMN IF NOT EXISTS presupuesto_item_id UUID;

ALTER TABLE item_notes ADD COLUMN IF NOT EXISTS texto TEXT;
ALTER TABLE item_notes ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE item_notes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Recibido';
ALTER TABLE item_notes ADD COLUMN IF NOT EXISTS assigned_to TEXT;
 ALTER TABLE item_notes ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}';

ALTER TABLE insumos ADD COLUMN IF NOT EXISTS salario_mensual DECIMAL(15,2);
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS rol TEXT;
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS unidad_pago TEXT DEFAULT 'Mes';
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS responsable_email TEXT;

-- ============================================================
-- PASO 3: ASEGURAR TABLAS QUE PUEDEN FALTAR
-- ============================================================
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

CREATE TABLE IF NOT EXISTS personal_proyecto (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID NOT NULL REFERENCES personal(id) ON DELETE CASCADE,
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  cargo_id UUID REFERENCES cargos(id) ON DELETE SET NULL,
  unidades_asignadas DECIMAL(12,4) DEFAULT 1,
  salario_pactado DECIMAL(15,2),
  unidad_pactada TEXT,
  tareas_asignadas JSONB DEFAULT '[]',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS global_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clave TEXT UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PASO 4: ASEGURAR RLS EN TODAS LAS TABLAS
-- ============================================================
ALTER TABLE cargo_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_proyecto ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_config ENABLE ROW LEVEL SECURITY;

-- Políticas flexibles para tablas que necesitan acceso compartido
DO $$ BEGIN
  -- cargo_detalle
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cargo_detalle' AND policyname = 'cargo_detalle_auth_all') THEN
    CREATE POLICY cargo_detalle_auth_all ON cargo_detalle FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
  -- personal_proyecto
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'personal_proyecto' AND policyname = 'personal_proyecto_auth_all') THEN
    CREATE POLICY personal_proyecto_auth_all ON personal_proyecto FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
  -- global_config
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'global_config' AND policyname = 'config_auth_all') THEN
    CREATE POLICY config_auth_all ON global_config FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- ============================================================
-- PASO 5: LIMPIAR TODOS LOS DATOS (respetando FK)
-- Orden de hijos a padres
-- ============================================================
TRUNCATE TABLE personal_proyecto CASCADE;
TRUNCATE TABLE cargo_detalle CASCADE;
TRUNCATE TABLE obra_avances CASCADE;
TRUNCATE TABLE item_notes CASCADE;
TRUNCATE TABLE bim_links CASCADE;
TRUNCATE TABLE inventario_transacciones CASCADE;
TRUNCATE TABLE presupuesto_items CASCADE;
TRUNCATE TABLE pagos_cliente CASCADE;
TRUNCATE TABLE bodegas CASCADE;
TRUNCATE TABLE personal CASCADE;
TRUNCATE TABLE apu_detalle CASCADE;
TRUNCATE TABLE apu CASCADE;
TRUNCATE TABLE insumos CASCADE;
TRUNCATE TABLE cargos CASCADE;
TRUNCATE TABLE categorias CASCADE;
TRUNCATE TABLE proyectos CASCADE;
TRUNCATE TABLE global_config CASCADE;
TRUNCATE TABLE profiles CASCADE;

-- ============================================================
-- PASO 6: LIMPIAR POLÍTICAS RLS DUPLICADAS
-- (Las políticas viejas de user_id pueden bloquear al nuevo usuario)
-- ============================================================

-- Reemplazar políticas estrictas de user_id por políticas basadas en autenticación
-- Esto es necesario porque los datos ahora son compartidos dentro de la organización

-- CARGOS: Necesitan ser visibles para todos los usuarios autenticados
DO $$ BEGIN
  -- Eliminar políticas viejas si existen
  DROP POLICY IF EXISTS "Users can manage own cargos" ON cargos;
  DROP POLICY IF EXISTS "Users can insert cargos" ON cargos;
  -- Crear política universal
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cargos' AND policyname = 'cargos_auth_all') THEN
    CREATE POLICY cargos_auth_all ON cargos FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- PERSONAL: Necesita ser visible para todos los usuarios autenticados
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage own personal" ON personal;
  DROP POLICY IF EXISTS "Users can insert personal" ON personal;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'personal' AND policyname = 'personal_auth_all') THEN
    CREATE POLICY personal_auth_all ON personal FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
SELECT 'profiles' as tabla, count(*) as registros FROM profiles
UNION ALL SELECT 'personal', count(*) FROM personal
UNION ALL SELECT 'cargos', count(*) FROM cargos
UNION ALL SELECT 'apu', count(*) FROM apu
UNION ALL SELECT 'insumos', count(*) FROM insumos
UNION ALL SELECT 'proyectos', count(*) FROM proyectos
UNION ALL SELECT 'global_config', count(*) FROM global_config;
