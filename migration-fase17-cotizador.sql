-- ============================================================
-- FASE 17 · COTIZADOR PÚBLICO KALARTI + SUSCRIPCIONES
-- Ejecutar en Supabase → SQL Editor (idempotente).
-- ============================================================

-- ─── Helpers de autorización ───
CREATE OR REPLACE FUNCTION public.is_kalarti_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    coalesce(lower(auth.jwt() ->> 'email'), '') LIKE '%@kalarti.com'
    OR lower(coalesce(auth.jwt() ->> 'email', '')) IN (
      'gsalo90@outlook.com', 'guillermosalomonsolarte@gmail.com', 'arq.guillermo_salomon@kalarti.com'
    )
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND upper(p.role) IN ('ADMIN', 'GERENCIA'));
$$;

-- ─── 1. Cuadrillas predefinidas (lectura pública) ───
CREATE TABLE IF NOT EXISTS cotizador_cuadrillas (
  codigo TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  orden INT NOT NULL DEFAULT 3,
  color TEXT DEFAULT '#94a3b8',
  composicion JSONB DEFAULT '[]'::jsonb,
  categorias TEXT[] DEFAULT '{}',
  cargo_id UUID REFERENCES cargos(id) ON DELETE SET NULL,
  activo BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE cotizador_cuadrillas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cot_cuadrillas_read" ON cotizador_cuadrillas;
DROP POLICY IF EXISTS "cot_cuadrillas_admin" ON cotizador_cuadrillas;
CREATE POLICY "cot_cuadrillas_read" ON cotizador_cuadrillas FOR SELECT USING (true);
CREATE POLICY "cot_cuadrillas_admin" ON cotizador_cuadrillas FOR ALL USING (public.is_kalarti_admin()) WITH CHECK (public.is_kalarti_admin());

INSERT INTO cotizador_cuadrillas (codigo, nombre, orden, color, composicion, categorias) VALUES
 ('CQ-01','Preliminares y Movimiento de Tierra',1,'#64748b','[{"cargo":"Oficial","cantidad":1},{"cargo":"Ayudante","cantidad":2}]', ARRAY['PRELIMINARES','MOVIMIENTO DE TIERRA']),
 ('CQ-02','Estructura y Concretos',2,'#3b82f6','[{"cargo":"Oficial","cantidad":1},{"cargo":"Ayudante","cantidad":3}]', ARRAY['CIMENTACIONES','ESTRUCTURAS CONCRETO','FUNDICION DE PISO','BASICOS','VIAS']),
 ('CQ-08','Bioconstrucción en Guadua',2,'#16a34a','[{"cargo":"Oficial","cantidad":1},{"cargo":"Ayudante","cantidad":2}]', ARRAY['CONSTRUCCION EN GUADUA','CONSTRUCCION EN ROLLIZA','ESTRUCTURAS MADERA']),
 ('CQ-03','Mampostería y Revoques',3,'#f97316','[{"cargo":"Oficial","cantidad":1},{"cargo":"Ayudante","cantidad":1}]', ARRAY['MUROS','REVOQUES']),
 ('CQ-04','Hidrosanitaria',3,'#06b6d4','[{"cargo":"Oficial","cantidad":1},{"cargo":"Ayudante","cantidad":1}]', ARRAY['INSTALACIONES HIDRAULICAS','PUNTOS SANITARIOS','CANALES Y BAJANTES','ALCANTARILLADOS']),
 ('CQ-05','Eléctrica',3,'#eab308','[{"cargo":"Oficial","cantidad":1},{"cargo":"Ayudante","cantidad":1}]', ARRAY['INSTALACIONES ELECTRICAS']),
 ('CQ-06','Cubiertas y Carpintería',4,'#a855f7','[{"cargo":"Oficial","cantidad":1},{"cargo":"Ayudante","cantidad":1}]', ARRAY['CUBIERTAS','CARPINTERIA MADERA','CARPINTERIA METALICA','VENTANERIA']),
 ('CQ-07','Acabados',5,'#ec4899','[{"cargo":"Oficial","cantidad":1},{"cargo":"Ayudante","cantidad":1}]', ARRAY['ENCHAPES','ENCHAPES CERAMICOS','ACCESORIOS PARA ENCHAPES','ACABADOS','PINTURAS DETALLADAS','ESTUCO Y PINTURA','ESTUCOS','OBRA EXTERIORES'])
ON CONFLICT (codigo) DO NOTHING;

-- ─── 1b. Crear las cuadrillas como CARGOS de la cuenta Kalarti (visible en ERP → Cargos) ───
DO $$
DECLARE
  v_uid UUID;
  v_ofi UUID;
  v_ayu UUID;
  r RECORD;
  v_cq UUID;
  v_n_ayu NUMERIC;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'guillermosalomonsolarte@gmail.com' LIMIT 1;
  IF v_uid IS NULL THEN
    RAISE NOTICE 'Cuenta Kalarti no encontrada: se omite la creación de cargos.';
    RETURN;
  END IF;

  INSERT INTO cargos (codigo, nombre, unidad, factor_smlv, categoria, user_id)
  VALUES ('OFIC-001', 'Oficial', 'Mes', 2.0, 'cuadrilla', v_uid)
  ON CONFLICT (codigo) DO NOTHING;
  INSERT INTO cargos (codigo, nombre, unidad, factor_smlv, categoria, user_id)
  VALUES ('AYU-001', 'Ayudante', 'Mes', 1.2, 'cuadrilla', v_uid)
  ON CONFLICT (codigo) DO NOTHING;
  SELECT id INTO v_ofi FROM cargos WHERE codigo = 'OFIC-001';
  SELECT id INTO v_ayu FROM cargos WHERE codigo = 'AYU-001';

  FOR r IN SELECT * FROM cotizador_cuadrillas LOOP
    INSERT INTO cargos (codigo, nombre, unidad, factor_smlv, categoria, user_id)
    VALUES (r.codigo, 'Cuadrilla ' || r.nombre, 'Día', 1, 'cuadrilla', v_uid)
    ON CONFLICT (codigo) DO NOTHING;
    SELECT id INTO v_cq FROM cargos WHERE codigo = r.codigo;

    IF NOT EXISTS (SELECT 1 FROM cargo_detalle WHERE cargo_padre_id = v_cq) THEN
      v_n_ayu := coalesce((SELECT (e->>'cantidad')::numeric FROM jsonb_array_elements(r.composicion) e WHERE e->>'cargo' = 'Ayudante' LIMIT 1), 1);
      INSERT INTO cargo_detalle (cargo_padre_id, cargo_hijo_id, cantidad, user_id) VALUES (v_cq, v_ofi, 1, v_uid);
      INSERT INTO cargo_detalle (cargo_padre_id, cargo_hijo_id, cantidad, user_id) VALUES (v_cq, v_ayu, v_n_ayu, v_uid);
    END IF;

    UPDATE cotizador_cuadrillas SET cargo_id = v_cq WHERE codigo = r.codigo;
  END LOOP;
END $$;

-- ─── 2. Catálogo curado publicado (solo precio final, NUNCA la composición del APU) ───
CREATE TABLE IF NOT EXISTS cotizador_catalogo (
  apu_id UUID PRIMARY KEY REFERENCES apu(id) ON DELETE CASCADE,
  codigo TEXT,
  nombre TEXT NOT NULL,
  nombre_publico TEXT,
  unidad TEXT,
  categoria TEXT,
  capitulo TEXT,
  precio_unitario NUMERIC(15,2) NOT NULL DEFAULT 0,
  rendimiento NUMERIC(12,4) NOT NULL DEFAULT 1,
  cuadrilla_codigo TEXT REFERENCES cotizador_cuadrillas(codigo) ON DELETE SET NULL,
  activo BOOLEAN DEFAULT true,
  orden INT DEFAULT 0,
  publicado_por TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE cotizador_catalogo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cot_catalogo_read" ON cotizador_catalogo;
DROP POLICY IF EXISTS "cot_catalogo_admin" ON cotizador_catalogo;
CREATE POLICY "cot_catalogo_read" ON cotizador_catalogo FOR SELECT USING (activo = true OR public.is_kalarti_admin());
CREATE POLICY "cot_catalogo_admin" ON cotizador_catalogo FOR ALL USING (public.is_kalarti_admin()) WITH CHECK (public.is_kalarti_admin());

-- ─── 3. Solicitudes (contratar obra / asesoría / solo guardar) ───
CREATE TABLE IF NOT EXISTS cotizador_solicitudes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('contratar_obra', 'asesoria', 'solo_guardar', 'empresa')),
  nombre TEXT, email TEXT, telefono TEXT, ciudad TEXT, mensaje TEXT,
  total NUMERIC(15,2),
  resumen JSONB,
  verificado BOOLEAN DEFAULT false,
  estado TEXT DEFAULT 'nueva',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE cotizador_solicitudes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cot_sol_insert" ON cotizador_solicitudes;
DROP POLICY IF EXISTS "cot_sol_select" ON cotizador_solicitudes;
DROP POLICY IF EXISTS "cot_sol_admin" ON cotizador_solicitudes;
CREATE POLICY "cot_sol_insert" ON cotizador_solicitudes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cot_sol_select" ON cotizador_solicitudes FOR SELECT USING (auth.uid() = user_id OR public.is_kalarti_admin());
CREATE POLICY "cot_sol_admin" ON cotizador_solicitudes FOR UPDATE USING (public.is_kalarti_admin());

-- ─── 4. Suscripciones (solo el servidor/webhook escribe con service role) ───
CREATE TABLE IF NOT EXISTS suscripciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('mensual', 'semestral', 'anual', 'empresa')),
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'vencida', 'cancelada')),
  inicio TIMESTAMPTZ DEFAULT now(),
  vence TIMESTAMPTZ NOT NULL,
  max_proyectos INT NOT NULL DEFAULT 1,
  max_usuarios INT NOT NULL DEFAULT 1,
  puede_editar_apu BOOLEAN DEFAULT false,
  proveedor TEXT,
  pasarela_ref TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE suscripciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "susc_select" ON suscripciones;
DROP POLICY IF EXISTS "susc_admin" ON suscripciones;
CREATE POLICY "susc_select" ON suscripciones FOR SELECT USING (auth.uid() = user_id OR public.is_kalarti_admin());
CREATE POLICY "susc_admin" ON suscripciones FOR ALL USING (public.is_kalarti_admin()) WITH CHECK (public.is_kalarti_admin());

-- ─── 5. Pagos de la plataforma (exportación / planes) ───
CREATE TABLE IF NOT EXISTS pagos_plataforma (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  producto TEXT NOT NULL CHECK (producto IN ('export', 'mensual', 'semestral', 'anual')),
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL,
  moneda TEXT NOT NULL CHECK (moneda IN ('COP', 'USD')),
  monto NUMERIC(15,2) NOT NULL,
  proveedor TEXT NOT NULL CHECK (proveedor IN ('mercadopago', 'paypal')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  pasarela_ref TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE pagos_plataforma ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pagos_plat_select" ON pagos_plataforma;
DROP POLICY IF EXISTS "pagos_plat_insert" ON pagos_plataforma;
CREATE POLICY "pagos_plat_select" ON pagos_plataforma FOR SELECT USING (auth.uid() = user_id OR public.is_kalarti_admin());
CREATE POLICY "pagos_plat_insert" ON pagos_plataforma FOR INSERT WITH CHECK (auth.uid() = user_id AND estado = 'pendiente');

-- ─── 6. Suscriptores activos pueden LEER la base de APUs completa ───
CREATE OR REPLACE FUNCTION public.has_active_subscription()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM suscripciones s WHERE s.user_id = auth.uid() AND s.estado = 'activa' AND s.vence > now());
$$;

DROP POLICY IF EXISTS "subs_read_apu_detalle" ON apu_detalle;
CREATE POLICY "subs_read_apu_detalle" ON apu_detalle FOR SELECT USING (public.has_active_subscription());
DROP POLICY IF EXISTS "subs_read_cargos" ON cargos;
CREATE POLICY "subs_read_cargos" ON cargos FOR SELECT USING (public.has_active_subscription());
DROP POLICY IF EXISTS "subs_read_cargo_detalle" ON cargo_detalle;
CREATE POLICY "subs_read_cargo_detalle" ON cargo_detalle FOR SELECT USING (public.has_active_subscription());
DROP POLICY IF EXISTS "subs_read_global_config" ON global_config;
CREATE POLICY "subs_read_global_config" ON global_config FOR SELECT USING (public.has_active_subscription());

-- ─── 7. Límite de proyectos para clientes (gratis: 1 · plan: max_proyectos) ───
CREATE OR REPLACE FUNCTION public.enforce_cliente_project_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_max INT;
  v_count INT;
BEGIN
  IF public.is_kalarti_admin() OR NEW.user_id IS NULL OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT max_proyectos INTO v_max FROM suscripciones
   WHERE user_id = NEW.user_id AND estado = 'activa' AND vence > now();
  v_max := coalesce(v_max, 1);
  SELECT count(*) INTO v_count FROM proyectos WHERE user_id = NEW.user_id;
  IF v_count >= v_max THEN
    RAISE EXCEPTION 'LIMITE_PROYECTOS: tu plan permite % proyecto(s).', v_max USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_cliente_project_limit ON proyectos;
CREATE TRIGGER trg_cliente_project_limit BEFORE INSERT ON proyectos
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cliente_project_limit();

CREATE INDEX IF NOT EXISTS idx_cot_catalogo_cat ON cotizador_catalogo(categoria);
CREATE INDEX IF NOT EXISTS idx_pagos_plat_user ON pagos_plataforma(user_id);
CREATE INDEX IF NOT EXISTS idx_cot_sol_created ON cotizador_solicitudes(created_at DESC);
