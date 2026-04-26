-- ============================================================
-- 🔓 MIGRACIÓN: MODERNIZACIÓN DE RLS PARA COLABORACIÓN EN CAMPO
-- Ejecutar en Supabase SQL Editor para desbloquear el portal móvil
-- ============================================================

-- 1. ASEGURAR QUE LAS TABLAS OPERATIVAS PERMITAN ACCESO A USUARIOS AUTENTICADOS
-- Eliminamos políticas restrictivas anteriores y creamos unas más flexibles (auth-all)

DO $$ 
DECLARE
    t text;
    tables_to_fix text[] := ARRAY[
        'categorias', 'insumos', 'apu', 'apu_detalle', 
        'proyectos', 'presupuesto_items', 'bodegas',
        'inventario_transacciones', 'pagos_cliente', 
        'obra_avances', 'bim_links', 'item_notes',
        'item_checklist_items', 'item_documents', 'control_asistencia'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_fix LOOP
        -- Asegurar que RLS esté activo
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        
        -- Eliminar políticas antiguas que usaban user_id de forma restrictiva
        EXECUTE format('DROP POLICY IF EXISTS "Users can manage own %s" ON %I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Users can insert %s" ON %I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Users can update %s" ON %I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Users can delete %s" ON %I', t, t);
        
        -- Crear nueva política universal para usuarios de la organización (autenticados)
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = t || '_auth_all') THEN
            EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'')', t || '_auth_all', t);
        END IF;
    END LOOP;
END $$;

-- 2. POLÍTICAS ESPECIALES PARA STORAGE (IMÁGENES Y EVIDENCIA)
-- Asegurar que todos puedan subir a 'obra-fotos'

DO $$ BEGIN
  -- Eliminar políticas de storage si existen
  DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
  DROP POLICY IF EXISTS "Public access to photos" ON storage.objects;
  
  -- Permitir subida a usuarios autenticados
  CREATE POLICY "Authenticated users can upload photos" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'obra-fotos' AND auth.role() = 'authenticated');
    
  -- Permitir lectura pública de las fotos
  CREATE POLICY "Public access to photos" ON storage.objects 
    FOR SELECT USING (bucket_id = 'obra-fotos');
EXCEPTION WHEN OTHERS THEN 
  RAISE NOTICE 'Error configurando storage: %', SQLERRM;
END $$;

-- 3. VERIFICACIÓN: Lista de políticas activas
SELECT tablename, policyname, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('proyectos', 'obra_avances', 'control_asistencia', 'item_notes');
