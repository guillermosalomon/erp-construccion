-- ============================================
-- Migración: Onboarding Personal — Nuevas Columnas
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Datos contractuales
ALTER TABLE personal ADD COLUMN IF NOT EXISTS horario_trabajo TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS intervalo_avances TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS tipo_contrato TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS fecha_ingreso DATE;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS fecha_contrato_fin DATE;

-- Seguridad social
ALTER TABLE personal ADD COLUMN IF NOT EXISTS eps_nombre TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS eps_numero TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS fondo_pensiones TEXT;

-- Datos bancarios
ALTER TABLE personal ADD COLUMN IF NOT EXISTS cuenta_bancaria TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS banco TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS tipo_cuenta TEXT;

-- Emergencia y dotación
ALTER TABLE personal ADD COLUMN IF NOT EXISTS contacto_emergencia TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS telefono_emergencia TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS talla_camisa TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS talla_pantalon TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS talla_zapatos TEXT;

-- Tracking de onboarding
ALTER TABLE personal ADD COLUMN IF NOT EXISTS onboarding_completado BOOLEAN DEFAULT false;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS onboarding_fecha TIMESTAMPTZ;

-- Dirección de residencia y ubicación
ALTER TABLE personal ADD COLUMN IF NOT EXISTS direccion_residencia TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS ciudad TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'Colombia';

-- Campos de perfil y documentos
ALTER TABLE personal ADD COLUMN IF NOT EXISTS factor_smlv NUMERIC;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'CC';
ALTER TABLE personal ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS cedula_url TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS tp_numero TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS tp_url TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS arl_numero TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS arl_url TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS portafolio_url TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS portafolio_nombre TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS hoja_vida_url TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS hoja_vida_nombre TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS diplomas_url TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS diplomas_nombre TEXT;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS cargos_ids JSONB DEFAULT '[]';
ALTER TABLE personal ADD COLUMN IF NOT EXISTS posgrados JSONB DEFAULT '[]';
ALTER TABLE personal ADD COLUMN IF NOT EXISTS salarios_por_cargo JSONB DEFAULT '{}';
