-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 20b — ARCHIVADO SEGURO (protocolo zz_)
-- ═══════════════════════════════════════════════════════════════════════════
-- Objetivo: retirar tablas abandonadas SIN borrarlas, renombrándolas a zz_*.
--
-- PROCEDIMIENTO
--   1. BACKUP PRIMERO (obligatorio). Ejemplos:
--        supabase db dump --data-only -f backup_fase20b_datos.sql
--        supabase db dump -f backup_fase20b_esquema.sql
--      o desde el panel: Database → Backups, o exportar cada tabla a CSV.
--   2. Ejecutar este script (es idempotente: IF EXISTS).
--   3. CUARENTENA DE 30 DÍAS: revisar errores en el ERP, la web y los logs
--      (Supabase → Logs → API, buscar "relation ... does not exist" / PGRST205).
--   4. Si algo falla, REVERTIR con un solo comando por tabla (ver sección REVERTIR).
--   5. Cumplido el plazo sin incidencias: ejecutar los DROP comentados al final.
--
-- TABLAS ARCHIVADAS
--   • cotizador_catalogo            → el catálogo se calcula en vivo (/api/cotizador/catalogo, motor APU).
--   • cotizador_cuadrillas          → el cotizador usa CUADRILLAS_DEFAULT / cargos CUA-* (src/lib/cotizador/config.js).
--                                     La API lo lee de forma tolerante y cae al valor por defecto si no existe.
--   • mk_ofertas_historial_precios  → nunca se activó (sin referencias en el código).
--
-- NO SE TOCAN tablas en uso (profiles, personal, clientes, proyectos, insumos, apu, mk_*, cotizador_solicitudes, etc.).
-- Nota: cotizador_catalogo tiene FK hacia cotizador_cuadrillas(codigo); el renombrado conserva la FK.
-- Nota: no volver a ejecutar migration-fase15/fase17 completas, porque recrearían estas tablas vacías.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE IF EXISTS public.cotizador_catalogo           RENAME TO zz_cotizador_catalogo;
ALTER TABLE IF EXISTS public.cotizador_cuadrillas         RENAME TO zz_cotizador_cuadrillas;
ALTER TABLE IF EXISTS public.mk_ofertas_historial_precios RENAME TO zz_mk_ofertas_historial_precios;

-- Marca de cuarentena (fecha de archivado) para saber cuándo vence el plazo
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['zz_cotizador_catalogo','zz_cotizador_cuadrillas','zz_mk_ofertas_historial_precios'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('COMMENT ON TABLE public.%I IS %L', t, 'ARCHIVADA (zz_) ' || to_char(now(), 'YYYY-MM-DD') || ' — eliminar tras 30 días sin incidencias');
    END IF;
  END LOOP;
END $$;

COMMIT;

-- Recargar el caché de esquema de PostgREST
NOTIFY pgrst, 'reload schema';

-- ─── REVERTIR (si aparece algún error durante la cuarentena) ───
-- ALTER TABLE IF EXISTS public.zz_cotizador_catalogo           RENAME TO cotizador_catalogo;
-- ALTER TABLE IF EXISTS public.zz_cotizador_cuadrillas         RENAME TO cotizador_cuadrillas;
-- ALTER TABLE IF EXISTS public.zz_mk_ofertas_historial_precios RENAME TO mk_ofertas_historial_precios;
-- NOTIFY pgrst, 'reload schema';

-- ─── DROP DEFINITIVO (solo tras 30 días de cuarentena y con backup verificado) ───
-- DROP TABLE IF EXISTS public.zz_cotizador_catalogo;            -- primero: depende (FK) de zz_cotizador_cuadrillas
-- DROP TABLE IF EXISTS public.zz_cotizador_cuadrillas;
-- DROP TABLE IF EXISTS public.zz_mk_ofertas_historial_precios;
