-- ============================================================================
-- FASE 22 — Ecosistema Kalarti: Onboarding Unificado, Red Bidireccional de
-- Talento, Cuadrillas Ociosas y Convocatorias de Obra
-- Ejecutar en Supabase → SQL Editor DESPUÉS de migration-fase22a-tenancy-rls.sql
-- Idempotente: se puede ejecutar más de una vez.
-- ============================================================================

-- ─── 1. Extensiones de Identidad en profiles (sin alterar DEFAULT de roles) ──
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tipo_registro TEXT,
  ADD COLUMN IF NOT EXISTS estado_verificacion TEXT DEFAULT 'PENDIENTE',
  ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'Colombia',
  ADD COLUMN IF NOT EXISTS profesion TEXT,
  ADD COLUMN IF NOT EXISTS acepta_habeas_data BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_habeas_data TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_estado_verificacion_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_estado_verificacion_check
      CHECK (estado_verificacion IN ('PENDIENTE', 'VERIFICADO', 'RECHAZADO')) NOT VALID;
  END IF;
END $$;

-- ─── 2. Extensiones de Red de Talento en personal ───────────────────────────
-- Nota: hoja_vida_url, tp_numero, tp_url, arl_numero, arl_url, portafolio_url
-- y cargos_ids (JSONB) ya existen en personal. Solo agregamos lo nuevo:
ALTER TABLE personal
  ADD COLUMN IF NOT EXISTS certificaciones JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS disponible_red_talento BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tarifa_referencia NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS tarifa_unidad TEXT DEFAULT 'Día',
  ADD COLUMN IF NOT EXISTS municipios_cobertura TEXT[] DEFAULT ARRAY['Pasto'],
  ADD COLUMN IF NOT EXISTS estado_verificacion TEXT DEFAULT 'PENDIENTE',
  ADD COLUMN IF NOT EXISTS resumen_experiencia TEXT,
  ADD COLUMN IF NOT EXISTS anos_experiencia INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_personal_red_talento
  ON personal(disponible_red_talento)
  WHERE disponible_red_talento = true;

-- ─── 3. Tabla de Cuadrillas con Capacidad Ociosa (B2B Subcontratación) ──────
CREATE TABLE IF NOT EXISTS cuadrillas_ofertadas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cargo_id UUID REFERENCES cargos(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  especialidad TEXT,
  municipio TEXT NOT NULL DEFAULT 'Pasto',
  integrantes INT NOT NULL DEFAULT 2,
  disponible_desde DATE,
  disponible_hasta DATE,
  tarifa_referencia NUMERIC(12,2),
  unidad_tarifa TEXT DEFAULT 'Día',
  descripcion TEXT,
  contacto_nombre TEXT,
  contacto_whatsapp TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cuadrillas_ofertadas_activa
  ON cuadrillas_ofertadas(activa, municipio);

DROP TRIGGER IF EXISTS trg_set_org ON cuadrillas_ofertadas;
CREATE TRIGGER trg_set_org BEFORE INSERT ON cuadrillas_ofertadas
  FOR EACH ROW EXECUTE FUNCTION public.set_organizacion_id();

ALTER TABLE cuadrillas_ofertadas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cuad_ofertadas_read ON cuadrillas_ofertadas;
DROP POLICY IF EXISTS cuad_ofertadas_write ON cuadrillas_ofertadas;

CREATE POLICY cuad_ofertadas_read ON cuadrillas_ofertadas
  FOR SELECT USING (activa = true OR organizacion_id IN (SELECT public.mis_organizaciones()) OR user_id = auth.uid() OR public.is_kalarti_admin());

CREATE POLICY cuad_ofertadas_write ON cuadrillas_ofertadas
  FOR ALL TO authenticated
  USING (organizacion_id IN (SELECT public.mis_organizaciones()) OR user_id = auth.uid() OR public.is_kalarti_admin())
  WITH CHECK (organizacion_id IN (SELECT public.mis_organizaciones()) OR user_id = auth.uid() OR public.is_kalarti_admin());

-- ─── 4. Convocatorias de Obra y Licitaciones ────────────────────────────────
CREATE TABLE IF NOT EXISTS convocatorias_ofertas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE,
  cargo_id UUID REFERENCES cargos(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  municipio TEXT NOT NULL DEFAULT 'Pasto',
  tipo_contrato TEXT DEFAULT 'Obra o Labor',
  salario_rango TEXT,
  descripcion TEXT,
  requisitos TEXT,
  vacantes INT DEFAULT 1,
  fecha_cierre DATE,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_convocatorias_activa
  ON convocatorias_ofertas(activa, municipio, cargo_id);

DROP TRIGGER IF EXISTS trg_set_org ON convocatorias_ofertas;
CREATE TRIGGER trg_set_org BEFORE INSERT ON convocatorias_ofertas
  FOR EACH ROW EXECUTE FUNCTION public.set_organizacion_id();

ALTER TABLE convocatorias_ofertas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS conv_read ON convocatorias_ofertas;
DROP POLICY IF EXISTS conv_write ON convocatorias_ofertas;

-- Cualquier usuario (incluso público en /unete) puede ver convocatorias activas
CREATE POLICY conv_read ON convocatorias_ofertas
  FOR SELECT USING (activa = true OR organizacion_id IN (SELECT public.mis_organizaciones()) OR user_id = auth.uid() OR public.is_kalarti_admin());

CREATE POLICY conv_write ON convocatorias_ofertas
  FOR ALL TO authenticated
  USING (organizacion_id IN (SELECT public.mis_organizaciones()) OR user_id = auth.uid() OR public.is_kalarti_admin())
  WITH CHECK (organizacion_id IN (SELECT public.mis_organizaciones()) OR user_id = auth.uid() OR public.is_kalarti_admin());

-- ─── 5. Postulaciones de Profesionales a Convocatorias ──────────────────────
CREATE TABLE IF NOT EXISTS postulaciones_profesionales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  oferta_id UUID NOT NULL REFERENCES convocatorias_ofertas(id) ON DELETE CASCADE,
  personal_id UUID REFERENCES personal(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  estado TEXT NOT NULL DEFAULT 'POSTULADO'
    CHECK (estado IN ('POSTULADO', 'PRESELECCIONADO', 'CONTRATADO', 'RECHAZADO')),
  mensaje TEXT,
  tarifa_propuesta NUMERIC(12,2),
  disponibilidad_inmediata BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (oferta_id, personal_id)
);

CREATE INDEX IF NOT EXISTS idx_postulaciones_oferta ON postulaciones_profesionales(oferta_id);
CREATE INDEX IF NOT EXISTS idx_postulaciones_user ON postulaciones_profesionales(user_id);

ALTER TABLE postulaciones_profesionales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS post_select ON postulaciones_profesionales;
DROP POLICY IF EXISTS post_insert ON postulaciones_profesionales;
DROP POLICY IF EXISTS post_update ON postulaciones_profesionales;
DROP POLICY IF EXISTS post_delete ON postulaciones_profesionales;

-- El postulante ve las suyas; la constructora dueña de la convocatoria ve los postulados a su oferta
CREATE POLICY post_select ON postulaciones_profesionales
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR personal_id IN (SELECT id FROM personal WHERE profile_id = auth.uid() OR user_id = auth.uid())
    OR oferta_id IN (
      SELECT id FROM convocatorias_ofertas
      WHERE organizacion_id IN (SELECT public.mis_organizaciones()) OR user_id = auth.uid()
    )
    OR public.is_kalarti_admin()
  );

CREATE POLICY post_insert ON postulaciones_profesionales
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    OR personal_id IN (SELECT id FROM personal WHERE profile_id = auth.uid() OR user_id = auth.uid())
    OR public.is_kalarti_admin()
  );

CREATE POLICY post_update ON postulaciones_profesionales
  FOR UPDATE TO authenticated USING (
    user_id = auth.uid()
    OR oferta_id IN (
      SELECT id FROM convocatorias_ofertas
      WHERE organizacion_id IN (SELECT public.mis_organizaciones()) OR user_id = auth.uid()
    )
    OR public.is_kalarti_admin()
  );

CREATE POLICY post_delete ON postulaciones_profesionales
  FOR DELETE TO authenticated USING (
    user_id = auth.uid() OR public.is_kalarti_admin()
  );

-- ─── 6. Permiso de lectura en personal cuando el profesional se postula ─────
-- Permite a la constructora ver la ficha completa de quienes se postularon a sus ofertas
-- o de quienes tienen disponible_red_talento = true
DROP POLICY IF EXISTS personal_select ON personal;
CREATE POLICY personal_select ON personal FOR SELECT TO authenticated USING (
  profile_id = auth.uid() OR user_id = auth.uid()
  OR organizacion_id IN (SELECT public.mis_organizaciones())
  OR public.is_kalarti_admin()
  OR disponible_red_talento = true
  OR id IN (SELECT personal_id FROM personal_proyecto)
  OR id IN (
    SELECT pp.personal_id FROM postulaciones_profesionales pp
    JOIN convocatorias_ofertas co ON co.id = pp.oferta_id
    WHERE co.organizacion_id IN (SELECT public.mis_organizaciones()) OR co.user_id = auth.uid()
  )
);

-- ─── 7. Vistas Públicas Seguras (Ley 1581 Habeas Data) ──────────────────────
-- v_red_talento: expone únicamente datos no sensibles para búsqueda abierta.
-- Teléfono, correo, cédula y documentos privados se desbloquean cuando el
-- profesional se postula o la constructora tiene plan/vinculación activa.
CREATE OR REPLACE VIEW public.v_red_talento AS
SELECT
  p.id,
  p.profile_id,
  coalesce(nullif(trim(coalesce(p.nombres, '') || ' ' || coalesce(p.apellidos, '')), ''), p.nombre, 'Profesional') AS nombre_publico,
  p.profesion,
  p.ciudad,
  p.pais,
  p.foto_url,
  p.cargo_id,
  p.cargos_ids,
  p.tarifa_referencia,
  coalesce(p.tarifa_unidad, p.unidad_pago, 'Día') AS tarifa_unidad,
  coalesce(p.municipios_cobertura, ARRAY[coalesce(p.ciudad, 'Pasto')]) AS municipios_cobertura,
  coalesce(pr.estado_verificacion, p.estado_verificacion, 'PENDIENTE') AS estado_verificacion,
  p.resumen_experiencia,
  p.anos_experiencia,
  (p.hoja_vida_url IS NOT NULL AND p.hoja_vida_url <> '') AS tiene_hv,
  (p.tp_url IS NOT NULL OR p.tp_numero IS NOT NULL) AS tiene_tarjeta_profesional,
  (p.arl_url IS NOT NULL OR p.arl_numero IS NOT NULL) AS tiene_arl,
  jsonb_array_length(coalesce(p.certificaciones, '[]'::jsonb)) AS total_certificaciones,
  p.portafolio_url,
  p.portafolio_nombre,
  p.disponible_red_talento,
  p.created_at
FROM personal p
LEFT JOIN profiles pr ON pr.id = p.profile_id
WHERE p.disponible_red_talento = true;

GRANT SELECT ON public.v_red_talento TO anon, authenticated;

-- v_convocatorias_publicas: expone las vacantes activas sin datos financieros confidenciales del proyecto
CREATE OR REPLACE VIEW public.v_convocatorias_publicas AS
SELECT
  co.id,
  co.titulo,
  co.municipio,
  co.tipo_contrato,
  co.salario_rango,
  co.descripcion,
  co.requisitos,
  co.vacantes,
  co.fecha_cierre,
  co.cargo_id,
  ca.nombre AS cargo_nombre,
  ca.codigo AS cargo_codigo,
  co.proyecto_id,
  pr.nombre AS proyecto_nombre,
  org.nombre AS empresa_nombre,
  co.activa,
  co.created_at
FROM convocatorias_ofertas co
LEFT JOIN cargos ca ON ca.id = co.cargo_id
LEFT JOIN proyectos pr ON pr.id = co.proyecto_id
LEFT JOIN organizaciones org ON org.id = co.organizacion_id
WHERE co.activa = true;

GRANT SELECT ON public.v_convocatorias_publicas TO anon, authenticated;
