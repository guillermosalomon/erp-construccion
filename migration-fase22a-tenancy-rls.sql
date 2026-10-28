-- ============================================================================
-- FASE 22a — Multi-tenant (organizaciones) + endurecimiento de RLS
-- Ejecutar en Supabase → SQL Editor ANTES de migration-fase22b-ecosistema-talento.sql
-- Idempotente: se puede ejecutar más de una vez.
--
-- Qué hace:
--   1. Crea organizaciones / organizacion_miembros y la organización "KALARTI".
--   2. Agrega organizacion_id a las tablas operativas del ERP y migra todo lo
--      existente a KALARTI. Las nuevas filas toman la organización activa del
--      usuario automáticamente (trigger), sin cambios en el frontend.
--   3. Reemplaza las políticas abiertas (USING true / WITH CHECK true) por
--      políticas por organización. El catálogo (APU, insumos, cargos...) sigue
--      siendo de lectura pública, pero solo el staff de Kalarti lo modifica.
--   4. Bloquea la auto-escalada de privilegios en profiles (role/roles).
--
-- NO toca: marketplace (mk_*), marketing_leads, cotizador_*, suscripciones,
--          pagos_plataforma, chat_* (siguen con sus políticas actuales).
-- Reversión de emergencia: migration-fase22a-rollback.sql
-- ============================================================================

-- ─── 1. Organizaciones ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE,
  nombre TEXT NOT NULL,
  nit TEXT,
  tipo TEXT DEFAULT 'CONSTRUCTORA' CHECK (tipo IN ('PLATAFORMA','CONSTRUCTORA','COMERCIO','PROVEEDOR')),
  municipio TEXT,
  plan TEXT DEFAULT 'free',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organizacion_miembros (
  organizacion_id UUID NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rol TEXT NOT NULL DEFAULT 'MIEMBRO' CHECK (rol IN ('ADMIN','MIEMBRO')),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (organizacion_id, profile_id)
);
CREATE INDEX IF NOT EXISTS idx_org_miembros_profile ON organizacion_miembros(profile_id);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organizacion_activa_id UUID REFERENCES organizaciones(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tipo_registro TEXT;

INSERT INTO organizaciones (slug, nombre, tipo, municipio, plan)
VALUES ('kalarti', 'KALARTI Constructores y Consultores S.A.S.', 'PLATAFORMA', 'Pasto', 'empresa')
ON CONFLICT (slug) DO NOTHING;

-- ─── 2. Funciones de seguridad (SECURITY DEFINER evita recursión de RLS) ────
CREATE OR REPLACE FUNCTION public.kalarti_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM organizaciones WHERE slug = 'kalarti' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.mis_organizaciones()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organizacion_id FROM organizacion_miembros WHERE profile_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.es_miembro_org(p_org UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM organizacion_miembros WHERE organizacion_id = p_org AND profile_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.es_admin_org(p_org UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM organizacion_miembros WHERE organizacion_id = p_org AND profile_id = auth.uid() AND rol = 'ADMIN');
$$;

-- Admin de plataforma: correos corporativos o ADMIN de la organización KALARTI.
-- (Ya no confía en profiles.role, que el propio usuario podía editar.)
CREATE OR REPLACE FUNCTION public.is_kalarti_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    coalesce(lower(auth.jwt() ->> 'email'), '') LIKE '%@kalarti.com'
    OR lower(coalesce(auth.jwt() ->> 'email', '')) IN (
      'gsalo90@outlook.com', 'guillermosalomonsolarte@gmail.com', 'arq.guillermo_salomon@kalarti.com'
    )
    OR EXISTS (
      SELECT 1 FROM organizacion_miembros m
      WHERE m.profile_id = auth.uid() AND m.rol = 'ADMIN' AND m.organizacion_id = public.kalarti_org_id()
    );
$$;

-- Staff de Kalarti (cualquier miembro de la organización KALARTI o admin de plataforma)
CREATE OR REPLACE FUNCTION public.es_staff_kalarti()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_kalarti_admin() OR public.es_miembro_org(public.kalarti_org_id());
$$;

-- Organización activa del usuario: la elegida en profiles (si sigue siendo miembro) o la primera.
CREATE OR REPLACE FUNCTION public.org_activa()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    (SELECT p.organizacion_activa_id FROM profiles p
       JOIN organizacion_miembros m ON m.organizacion_id = p.organizacion_activa_id AND m.profile_id = p.id
      WHERE p.id = auth.uid()),
    (SELECT organizacion_id FROM organizacion_miembros WHERE profile_id = auth.uid() ORDER BY created_at LIMIT 1)
  );
$$;

-- Trigger genérico: completa organizacion_id con la organización activa del usuario
CREATE OR REPLACE FUNCTION public.set_organizacion_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organizacion_id IS NULL THEN
    NEW.organizacion_id := public.org_activa();
  END IF;
  RETURN NEW;
END $$;

-- ─── 3. Miembros iniciales de KALARTI (staff actual) ────────────────────────
INSERT INTO organizacion_miembros (organizacion_id, profile_id, rol)
SELECT public.kalarti_org_id(), p.id,
       CASE WHEN EXISTS (SELECT 1 FROM unnest(coalesce(p.roles, ARRAY[]::text[]) || ARRAY[coalesce(p.role,'')]) r
                          WHERE upper(r) IN ('ADMIN','GERENCIA'))
              OR lower(p.email) LIKE '%@kalarti.com'
              OR lower(p.email) IN ('gsalo90@outlook.com','guillermosalomonsolarte@gmail.com','arq.guillermo_salomon@kalarti.com')
            THEN 'ADMIN' ELSE 'MIEMBRO' END
FROM profiles p
WHERE lower(coalesce(p.email,'')) LIKE '%@kalarti.com'
   OR lower(coalesce(p.email,'')) IN ('gsalo90@outlook.com','guillermosalomonsolarte@gmail.com','arq.guillermo_salomon@kalarti.com')
   OR EXISTS (SELECT 1 FROM unnest(coalesce(p.roles, ARRAY[]::text[]) || ARRAY[coalesce(p.role,'')]) r
               WHERE upper(r) NOT IN ('', 'CLIENTE'))
   OR EXISTS (SELECT 1 FROM personal pe WHERE pe.profile_id = p.id OR pe.user_id = p.id)
ON CONFLICT (organizacion_id, profile_id) DO NOTHING;

UPDATE profiles SET organizacion_activa_id = public.kalarti_org_id()
WHERE organizacion_activa_id IS NULL
  AND id IN (SELECT profile_id FROM organizacion_miembros WHERE organizacion_id = public.kalarti_org_id());

-- ─── 4. organizacion_id en tablas operativas + backfill a KALARTI ───────────
DO $$
DECLARE
  t TEXT;
  r RECORD;
  chk_names TEXT[];
  chk_defs TEXT[];
  i INT;
  tablas TEXT[] := ARRAY[
    'proyectos','presupuesto_items','bim_links','obra_avances','item_notes',
    'bodegas','inventario_transacciones','pagos_cliente','personal_proyecto',
    'item_checklist_items','item_documents','control_asistencia',
    'erp_ordenes_compra','pos_agenda','insumo_cotizaciones','personal'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Tabla % no existe, se omite', t;
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organizacion_id UUID REFERENCES organizaciones(id)', t);

    -- Pausar CHECK constraints durante el backfill para no fallar con filas históricas (ej. invtx_consumo_cuadrilla)
    chk_names := ARRAY[]::TEXT[];
    chk_defs  := ARRAY[]::TEXT[];
    FOR r IN
      SELECT c.conname, pg_get_constraintdef(c.oid) AS condef
      FROM pg_constraint c
      WHERE c.conrelid = ('public.' || t)::regclass AND c.contype = 'c'
    LOOP
      chk_names := array_append(chk_names, r.conname);
      chk_defs  := array_append(chk_defs, r.condef);
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t, r.conname);
    END LOOP;

    EXECUTE format('UPDATE public.%I SET organizacion_id = public.kalarti_org_id() WHERE organizacion_id IS NULL', t);

    IF array_length(chk_names, 1) IS NOT NULL THEN
      FOR i IN 1..array_length(chk_names, 1) LOOP
        EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I %s NOT VALID', t, chk_names[i], chk_defs[i]);
      END LOOP;
    END IF;

    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(organizacion_id)', 'idx_' || t || '_org', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_org ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_set_org BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_organizacion_id()', t);
    -- Borrar TODAS las políticas existentes (incluidas las "public_write_*" abiertas)
    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    IF t NOT IN ('proyectos','presupuesto_items','pagos_cliente','personal') THEN
      EXECUTE format(
        'CREATE POLICY tenant_all ON public.%I FOR ALL TO authenticated
           USING (organizacion_id IN (SELECT public.mis_organizaciones()) OR public.is_kalarti_admin())
           WITH CHECK (organizacion_id IN (SELECT public.mis_organizaciones()) OR public.is_kalarti_admin())', t);
    END IF;
  END LOOP;
END $$;

-- Código de proyecto único POR organización (antes era único global)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.conrelid = 'public.proyectos'::regclass AND c.contype = 'u' AND a.attname = 'codigo'
      AND array_length(c.conkey, 1) = 1
  LOOP
    EXECUTE format('ALTER TABLE public.proyectos DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_proyectos_org_codigo ON proyectos(organizacion_id, codigo);

-- Proyectos: organización o dueño directo (clientes del cotizador sin organización)
CREATE POLICY tenant_all ON proyectos FOR ALL TO authenticated
  USING (organizacion_id IN (SELECT public.mis_organizaciones()) OR user_id = auth.uid() OR public.is_kalarti_admin())
  WITH CHECK (organizacion_id IN (SELECT public.mis_organizaciones()) OR user_id = auth.uid() OR public.is_kalarti_admin());

-- Hijos directos del proyecto: organización o proyecto propio
CREATE POLICY tenant_all ON presupuesto_items FOR ALL TO authenticated
  USING (organizacion_id IN (SELECT public.mis_organizaciones()) OR public.is_kalarti_admin()
         OR proyecto_id IN (SELECT id FROM proyectos WHERE user_id = auth.uid()))
  WITH CHECK (organizacion_id IN (SELECT public.mis_organizaciones()) OR public.is_kalarti_admin()
         OR proyecto_id IN (SELECT id FROM proyectos WHERE user_id = auth.uid()));

CREATE POLICY tenant_all ON pagos_cliente FOR ALL TO authenticated
  USING (organizacion_id IN (SELECT public.mis_organizaciones()) OR public.is_kalarti_admin()
         OR proyecto_id IN (SELECT id FROM proyectos WHERE user_id = auth.uid()))
  WITH CHECK (organizacion_id IN (SELECT public.mis_organizaciones()) OR public.is_kalarti_admin());

-- ─── 5. Personal: ficha propia, empleador o vinculado a un proyecto visible ─
-- organizacion_id NULL = profesional independiente (Red de Talento)
CREATE POLICY personal_select ON personal FOR SELECT TO authenticated USING (
  profile_id = auth.uid() OR user_id = auth.uid()
  OR organizacion_id IN (SELECT public.mis_organizaciones())
  OR public.is_kalarti_admin()
  OR id IN (SELECT personal_id FROM personal_proyecto)   -- hereda la RLS de personal_proyecto
);
CREATE POLICY personal_insert ON personal FOR INSERT TO authenticated WITH CHECK (
  profile_id = auth.uid() OR user_id = auth.uid()
  OR organizacion_id IN (SELECT public.mis_organizaciones())
  OR public.is_kalarti_admin()
);
CREATE POLICY personal_update ON personal FOR UPDATE TO authenticated USING (
  profile_id = auth.uid() OR user_id = auth.uid()
  OR organizacion_id IN (SELECT public.mis_organizaciones())
  OR public.is_kalarti_admin()
);
CREATE POLICY personal_delete ON personal FOR DELETE TO authenticated USING (
  organizacion_id IN (SELECT public.mis_organizaciones()) OR public.is_kalarti_admin()
);

-- Cuando un admin de la organización enlaza una ficha de personal a un perfil,
-- ese perfil pasa a ser miembro de la organización (acceso al ERP de esa empresa).
CREATE OR REPLACE FUNCTION public.personal_sync_miembro()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.profile_id IS NOT NULL AND NEW.organizacion_id IS NOT NULL
     AND (auth.uid() IS NULL OR public.es_admin_org(NEW.organizacion_id) OR public.is_kalarti_admin()
          OR public.es_miembro_org(NEW.organizacion_id)) THEN
    INSERT INTO organizacion_miembros (organizacion_id, profile_id, rol)
    VALUES (NEW.organizacion_id, NEW.profile_id, 'MIEMBRO')
    ON CONFLICT (organizacion_id, profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_personal_sync_miembro ON personal;
CREATE TRIGGER trg_personal_sync_miembro AFTER INSERT OR UPDATE OF profile_id, organizacion_id ON personal
  FOR EACH ROW EXECUTE FUNCTION public.personal_sync_miembro();

-- El profesional que se registra solo (sin organización) queda independiente:
-- el trigger trg_set_org dejará NULL porque no pertenece a ninguna organización.

-- ─── 6. Catálogo compartido: lectura pública, escritura solo staff Kalarti ──
DO $$
DECLARE
  t TEXT;
  r RECORD;
  tablas TEXT[] := ARRAY['apu','apu_detalle','insumos','cargos','cargo_detalle','categorias','global_config'];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY catalogo_read ON public.%I FOR SELECT USING (true)', t);
    EXECUTE format('CREATE POLICY catalogo_write ON public.%I FOR ALL TO authenticated
                      USING (public.es_staff_kalarti()) WITH CHECK (public.es_staff_kalarti())', t);
  END LOOP;
END $$;

-- Directorio de proveedores: lectura para usuarios autenticados; escritura staff o el propio proveedor
DO $$
DECLARE r RECORD;
BEGIN
  IF to_regclass('public.erp_proveedores') IS NOT NULL THEN
    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'erp_proveedores' LOOP
      EXECUTE format('DROP POLICY %I ON public.erp_proveedores', r.policyname);
    END LOOP;
    ALTER TABLE erp_proveedores ENABLE ROW LEVEL SECURITY;
    CREATE POLICY prov_read ON erp_proveedores FOR SELECT TO authenticated USING (true);
    CREATE POLICY prov_write ON erp_proveedores FOR ALL TO authenticated
      USING (public.es_staff_kalarti() OR profile_id = auth.uid())
      WITH CHECK (public.es_staff_kalarti() OR profile_id = auth.uid());
  END IF;
END $$;

-- ─── 7. Organizaciones y miembros ───────────────────────────────────────────
ALTER TABLE organizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizacion_miembros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_select ON organizaciones;
DROP POLICY IF EXISTS org_insert ON organizaciones;
DROP POLICY IF EXISTS org_update ON organizaciones;
CREATE POLICY org_select ON organizaciones FOR SELECT TO authenticated
  USING (id IN (SELECT public.mis_organizaciones()) OR public.is_kalarti_admin());
CREATE POLICY org_insert ON organizaciones FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY org_update ON organizaciones FOR UPDATE TO authenticated
  USING (public.es_admin_org(id) OR public.is_kalarti_admin());

DROP POLICY IF EXISTS miem_select ON organizacion_miembros;
DROP POLICY IF EXISTS miem_admin ON organizacion_miembros;
CREATE POLICY miem_select ON organizacion_miembros FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR organizacion_id IN (SELECT public.mis_organizaciones()) OR public.is_kalarti_admin());
CREATE POLICY miem_admin ON organizacion_miembros FOR ALL TO authenticated
  USING (public.es_admin_org(organizacion_id) OR public.is_kalarti_admin())
  WITH CHECK (public.es_admin_org(organizacion_id) OR public.is_kalarti_admin());

-- Quien crea la organización queda como ADMIN y como organización activa
CREATE OR REPLACE FUNCTION public.org_creador_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO organizacion_miembros (organizacion_id, profile_id, rol)
    VALUES (NEW.id, NEW.created_by, 'ADMIN')
    ON CONFLICT (organizacion_id, profile_id) DO UPDATE SET rol = 'ADMIN';
    UPDATE profiles SET organizacion_activa_id = NEW.id
     WHERE id = NEW.created_by AND organizacion_activa_id IS NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_org_creador_admin ON organizaciones;
CREATE TRIGGER trg_org_creador_admin AFTER INSERT ON organizaciones
  FOR EACH ROW EXECUTE FUNCTION public.org_creador_admin();

-- RPC usada en el onboarding de constructoras/comercios (idempotente)
CREATE OR REPLACE FUNCTION public.crear_organizacion(p_nombre TEXT, p_nit TEXT DEFAULT NULL, p_tipo TEXT DEFAULT 'CONSTRUCTORA', p_municipio TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT o.id INTO v_id FROM organizaciones o
    JOIN organizacion_miembros m ON m.organizacion_id = o.id AND m.profile_id = auth.uid() AND m.rol = 'ADMIN'
   WHERE o.created_by = auth.uid() LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  INSERT INTO organizaciones (nombre, nit, tipo, municipio, created_by)
  VALUES (coalesce(nullif(trim(p_nombre), ''), 'Mi empresa'), p_nit,
          CASE WHEN upper(p_tipo) IN ('CONSTRUCTORA','COMERCIO','PROVEEDOR') THEN upper(p_tipo) ELSE 'CONSTRUCTORA' END,
          p_municipio, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.crear_organizacion(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Cambiar de organización activa (solo a una de la que es miembro)
CREATE OR REPLACE FUNCTION public.cambiar_organizacion_activa(p_org UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.es_miembro_org(p_org) THEN RAISE EXCEPTION 'No eres miembro de esa organización'; END IF;
  UPDATE profiles SET organizacion_activa_id = p_org WHERE id = auth.uid();
END $$;
GRANT EXECUTE ON FUNCTION public.cambiar_organizacion_activa(UUID) TO authenticated;

-- ─── 8. Profiles: solo el propio perfil, compañeros de organización o staff ─
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' LOOP
    EXECUTE format('DROP POLICY %I ON public.profiles', r.policyname);
  END LOOP;
END $$;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated USING (
  id = auth.uid() OR public.es_staff_kalarti()
  OR id IN (SELECT profile_id FROM organizacion_miembros WHERE organizacion_id IN (SELECT public.mis_organizaciones()))
);
CREATE POLICY profiles_insert ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_kalarti_admin());
CREATE POLICY profiles_update ON profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_kalarti_admin());
CREATE POLICY profiles_delete ON profiles FOR DELETE TO authenticated USING (public.is_kalarti_admin());

-- Evita que un usuario se otorgue ADMIN editando su propio perfil.
-- Se permite agregar CLIENTE/PROFESIONAL/CONSTRUCTOR/COMERCIO/PROVEEDOR (onboarding).
CREATE OR REPLACE FUNCTION public.profiles_proteger_roles()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  permitidos TEXT[] := ARRAY['CLIENTE','PROFESIONAL','CONSTRUCTOR','COMERCIO','PROVEEDOR'];
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
DROP TRIGGER IF EXISTS trg_profiles_proteger_roles ON profiles;
CREATE TRIGGER trg_profiles_proteger_roles BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_proteger_roles();

-- ─── 9. Verificación rápida ─────────────────────────────────────────────────
-- SELECT * FROM organizaciones;
-- SELECT o.nombre, p.email, m.rol FROM organizacion_miembros m JOIN organizaciones o ON o.id = m.organizacion_id JOIN profiles p ON p.id = m.profile_id;
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
