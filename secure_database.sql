-- ============================================================
-- 🛡️ SCRIPT DE SEGURIDAD MAESTRO: Cierre de Acceso Público (RLS)
-- Este script habilita RLS en TODAS las tablas y crea políticas
-- que permiten el acceso únicamente a usuarios AUTENTICADOS.
-- ============================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- 1. Iterar sobre todas las tablas del esquema 'public'
    FOR r IN (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    ) LOOP
        -- A. Activar RLS en la tabla
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.table_name);
        
        -- B. Eliminar cualquier política antigua que pudiera ser insegura
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.table_name || '_auth_all', r.table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Users can manage own %s" ON public.%I', r.table_name, r.table_name);
        
        -- C. Crear política universal: Solo usuarios logueados pueden hacer TODO (CRUD)
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'')', 
            r.table_name || '_auth_all', 
            r.table_name
        );
    END LOOP;

    RAISE NOTICE '✅ Seguridad de Base de Datos reforzada exitosamente en todas las tablas.';
END $$;
