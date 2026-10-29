-- ============================================================================
-- FASE 23 — Vertical Inmobiliario: Publicar Inmueble (Particulares 3% vs
-- Inmobiliarias 0.3%), Perfiles de Corredores, CRM de Prospectos y Privacidad
-- Ejecutar en Supabase → SQL Editor DESPUÉS de migration-fase22-ecosistema-talento.sql
-- Idempotente: se puede ejecutar más de una vez.
-- ============================================================================

-- ─── 1. Permitir tipo 'INMOBILIARIA' en crear_organizacion ──────────────────
CREATE OR REPLACE FUNCTION public.crear_organizacion(
  p_nombre TEXT,
  p_nit TEXT DEFAULT NULL,
  p_tipo TEXT DEFAULT 'CONSTRUCTORA',
  p_municipio TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT o.id INTO v_id FROM organizaciones o
    JOIN organizacion_miembros m ON m.organizacion_id = o.id AND m.profile_id = auth.uid() AND m.rol = 'ADMIN'
   WHERE o.created_by = auth.uid() LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  INSERT INTO organizaciones (nombre, nit, tipo, municipio, created_by)
  VALUES (
    coalesce(nullif(trim(p_nombre), ''), 'Mi empresa'),
    p_nit,
    CASE
      WHEN upper(p_tipo) IN ('CONSTRUCTORA','COMERCIO','PROVEEDOR','INMOBILIARIA') THEN upper(p_tipo)
      ELSE 'CONSTRUCTORA'
    END,
    p_municipio,
    auth.uid()
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.crear_organizacion(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Permitir roles PROPIETARIO e INMOBILIARIA en profiles_proteger_roles
CREATE OR REPLACE FUNCTION public.profiles_proteger_roles()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  permitidos TEXT[] := ARRAY['CLIENTE','PROFESIONAL','CONSTRUCTOR','COMERCIO','PROVEEDOR','PROPIETARIO','INMOBILIARIA','CORREDOR'];
  r TEXT;
BEGIN
  IF auth.uid() IS NULL OR public.is_kalarti_admin() THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF upper(coalesce(NEW.role,'')) IS DISTINCT FROM upper(coalesce(OLD.role,''))
       AND NOT (upper(coalesce(NEW.role,'')) = ANY(permitidos)) THEN
      NEW.role := OLD.role;
    END IF;
    FOREACH r IN ARRAY coalesce(NEW.roles, ARRAY[]::text[]) LOOP
      IF NOT (upper(r) = ANY(permitidos)) AND NOT (r = ANY(coalesce(OLD.roles, ARRAY[]::text[]))) THEN
        NEW.roles := OLD.roles; EXIT;
      END IF;
    END LOOP;
  ELSE
    IF NOT (upper(coalesce(NEW.role,'CLIENTE')) = ANY(permitidos)) THEN NEW.role := 'CLIENTE'; END IF;
    NEW.roles := ARRAY(SELECT upper(x) FROM unnest(coalesce(NEW.roles, ARRAY[]::text[])) x WHERE upper(x) = ANY(permitidos));
  END IF;
  RETURN NEW;
END $$;

-- ─── 2. Tabla de Perfiles de Corredores Inmobiliarios ───────────────────────
CREATE TABLE IF NOT EXISTS inmueble_corredores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  documento TEXT,
  email TEXT,
  telefono TEXT,
  whatsapp TEXT,
  ciudad TEXT DEFAULT 'Pasto',
  cargo TEXT DEFAULT 'Corredor Inmobiliario',
  comision_interna_pct NUMERIC(5,2) DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inmueble_corredores_org ON inmueble_corredores(organizacion_id, activo);

DROP TRIGGER IF EXISTS trg_set_org ON inmueble_corredores;
CREATE TRIGGER trg_set_org BEFORE INSERT ON inmueble_corredores
  FOR EACH ROW EXECUTE FUNCTION public.set_organizacion_id();

ALTER TABLE inmueble_corredores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS corredores_select ON inmueble_corredores;
DROP POLICY IF EXISTS corredores_write ON inmueble_corredores;

-- Cada inmobiliaria ve únicamente sus propios corredores; Kalarti ve los suyos
CREATE POLICY corredores_select ON inmueble_corredores
  FOR SELECT TO authenticated
  USING (
    organizacion_id IN (SELECT public.mis_organizaciones())
    OR creado_por = auth.uid()
    OR profile_id = auth.uid()
    OR public.is_kalarti_admin()
  );

CREATE POLICY corredores_write ON inmueble_corredores
  FOR ALL TO authenticated
  USING (
    organizacion_id IN (SELECT public.mis_organizaciones())
    OR creado_por = auth.uid()
    OR public.is_kalarti_admin()
  )
  WITH CHECK (
    organizacion_id IN (SELECT public.mis_organizaciones())
    OR creado_por = auth.uid()
    OR public.is_kalarti_admin()
  );

-- ─── 3. Extensiones Contractuales y de Aislamiento en inmuebles ─────────────
ALTER TABLE inmuebles
  ADD COLUMN IF NOT EXISTS organizacion_id UUID REFERENCES organizaciones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS modalidad_publicacion TEXT DEFAULT 'KALARTI', -- 'PARTICULAR_3' (3%), 'INMOBILIARIA_03' (0.3%), 'KALARTI'
  ADD COLUMN IF NOT EXISTS comision_plataforma_pct NUMERIC(5,2) DEFAULT 3.00,
  ADD COLUMN IF NOT EXISTS corredor_id UUID REFERENCES inmueble_corredores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS propietario_email TEXT,
  ADD COLUMN IF NOT EXISTS propietario_documento TEXT,
  ADD COLUMN IF NOT EXISTS matricula_inmobiliaria TEXT,
  ADD COLUMN IF NOT EXISTS acepta_contrato_comision BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_aceptacion_contrato TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acepta_habeas_data BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_inmuebles_org ON inmuebles(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_inmuebles_user ON inmuebles(user_id);

DROP TRIGGER IF EXISTS trg_set_org ON inmuebles;
CREATE TRIGGER trg_set_org BEFORE INSERT ON inmuebles
  FOR EACH ROW EXECUTE FUNCTION public.set_organizacion_id();

ALTER TABLE inmuebles ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inmuebles' LOOP
    EXECUTE format('DROP POLICY %I ON public.inmuebles', r.policyname);
  END LOOP;
END $$;

-- Lectura pública de inmuebles disponibles; propietarios e inmobiliarias ven toda su cartera
CREATE POLICY inmuebles_select ON inmuebles
  FOR SELECT USING (
    estado = 'DISPONIBLE'
    OR user_id = auth.uid()
    OR organizacion_id IN (SELECT public.mis_organizaciones())
    OR public.es_staff_kalarti()
  );

CREATE POLICY inmuebles_insert ON inmuebles
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR organizacion_id IN (SELECT public.mis_organizaciones())
    OR public.es_staff_kalarti()
  );

CREATE POLICY inmuebles_update ON inmuebles
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR organizacion_id IN (SELECT public.mis_organizaciones())
    OR public.es_staff_kalarti()
  );

CREATE POLICY inmuebles_delete ON inmuebles
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR organizacion_id IN (SELECT public.mis_organizaciones())
    OR public.is_kalarti_admin()
  );

-- ─── 4. CRM de Prospectos Inmobiliarios (inmueble_leads) con Aislamiento ────
CREATE TABLE IF NOT EXISTS inmueble_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inmueble_id UUID REFERENCES inmuebles(id) ON DELETE CASCADE,
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  corredor_id UUID REFERENCES inmueble_corredores(id) ON DELETE SET NULL,
  nombre_interesado TEXT,
  telefono TEXT,
  email TEXT,
  mensaje TEXT,
  etapa_crm TEXT DEFAULT 'NUEVO',
  notas_seguimiento TEXT,
  valor_oferta NUMERIC(15,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE inmueble_leads
  ADD COLUMN IF NOT EXISTS organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS corredor_id UUID REFERENCES inmueble_corredores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS etapa_crm TEXT DEFAULT 'NUEVO',
  ADD COLUMN IF NOT EXISTS notas_seguimiento TEXT,
  ADD COLUMN IF NOT EXISTS valor_oferta NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Trigger que hereda organizacion_id y corredor_id desde el inmueble cuando entra un lead público
CREATE OR REPLACE FUNCTION public.inmueble_lead_sync_org()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org UUID;
  v_corr UUID;
BEGIN
  IF NEW.inmueble_id IS NOT NULL THEN
    SELECT organizacion_id, corredor_id INTO v_org, v_corr
    FROM inmuebles WHERE id = NEW.inmueble_id;
    IF NEW.organizacion_id IS NULL THEN NEW.organizacion_id := v_org; END IF;
    IF NEW.corredor_id IS NULL THEN NEW.corredor_id := v_corr; END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_inmueble_lead_sync_org ON inmueble_leads;
CREATE TRIGGER trg_inmueble_lead_sync_org BEFORE INSERT ON inmueble_leads
  FOR EACH ROW EXECUTE FUNCTION public.inmueble_lead_sync_org();

ALTER TABLE inmueble_leads ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inmueble_leads' LOOP
    EXECUTE format('DROP POLICY %I ON public.inmueble_leads', r.policyname);
  END LOOP;
END $$;

-- Cualquier visitante puede enviar una consulta por un inmueble (INSERT)
CREATE POLICY inmueble_leads_insert ON inmueble_leads
  FOR INSERT WITH CHECK (true);

-- Lectura aislada:
-- 1. La inmobiliaria ve los leads de sus inmuebles (organizacion_id).
-- 2. Para inmuebles de particulares (PARTICULAR_3), Kalarti gestiona el seguimiento con sus corredores;
--    el propietario particular también puede consultar el avance de sus prospectos.
CREATE POLICY inmueble_leads_select ON inmueble_leads
  FOR SELECT TO authenticated
  USING (
    organizacion_id IN (SELECT public.mis_organizaciones())
    OR public.es_staff_kalarti()
    OR inmueble_id IN (SELECT id FROM inmuebles WHERE user_id = auth.uid())
  );

CREATE POLICY inmueble_leads_update ON inmueble_leads
  FOR UPDATE TO authenticated
  USING (
    organizacion_id IN (SELECT public.mis_organizaciones())
    OR public.es_staff_kalarti()
  );

CREATE POLICY inmueble_leads_delete ON inmueble_leads
  FOR DELETE TO authenticated
  USING (
    organizacion_id IN (SELECT public.mis_organizaciones())
    OR public.is_kalarti_admin()
  );

-- ─── 5. Vista Pública Segura (Protección de Datos del Propietario Ley 1581) ─
CREATE OR REPLACE VIEW public.v_inmuebles_publicos AS
SELECT
  i.id,
  i.titulo,
  i.descripcion,
  i.tipo,
  i.operacion,
  i.precio,
  i.ciudad,
  i.departamento,
  i.direccion,
  i.tour_360_url,
  i.portada_url,
  i.area_terreno,
  i.area_construida,
  i.habitaciones,
  i.banos,
  i.parqueaderos,
  i.amenidades,
  i.espacios_zonas,
  i.estado,
  i.modalidad_publicacion,
  i.corredor_id,
  coalesce(c.nombre, org.nombre, 'Mesa de Corretaje Kalarti') AS corredor_publico_nombre,
  i.created_at
FROM inmuebles i
LEFT JOIN inmueble_corredores c ON c.id = i.corredor_id
LEFT JOIN organizaciones org ON org.id = i.organizacion_id
WHERE i.estado = 'DISPONIBLE';

GRANT SELECT ON public.v_inmuebles_publicos TO anon, authenticated;

-- ─── 6. Garantizar visibilidad de Tiendas y Puntos de Venta para Kalarti ────
DO $$
BEGIN
  IF to_regclass('public.mk_tiendas') IS NOT NULL THEN
    DROP POLICY IF EXISTS kalarti_admin_mk_tiendas ON public.mk_tiendas;
    CREATE POLICY kalarti_admin_mk_tiendas ON public.mk_tiendas
      FOR ALL TO authenticated
      USING (user_id = auth.uid() OR public.es_staff_kalarti() OR activa = true)
      WITH CHECK (user_id = auth.uid() OR public.es_staff_kalarti());
  END IF;
  IF to_regclass('public.mk_puntos_venta') IS NOT NULL THEN
    DROP POLICY IF EXISTS kalarti_admin_mk_pv ON public.mk_puntos_venta;
    CREATE POLICY kalarti_admin_mk_pv ON public.mk_puntos_venta
      FOR ALL TO authenticated
      USING (user_id = auth.uid() OR public.es_staff_kalarti() OR activo = true)
      WITH CHECK (user_id = auth.uid() OR public.es_staff_kalarti());
  END IF;
END $$;
