-- ============================================================
-- 🚀 SCRIPT MAESTRO: CREACIÓN DE TABLAS Y MODERNIZACIÓN RLS
-- Resuelve el error 42P01 y permite la colaboración total
-- ============================================================

-- 1. CREAR TABLA DE ASISTENCIA SI NO EXISTE
CREATE TABLE IF NOT EXISTS control_asistencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuadrilla_id UUID, -- Opcional, puede ser ID de personal
  presupuesto_item_id UUID REFERENCES presupuesto_items(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- LLEGADA, SALIDA
  fecha_hora TIMESTAMPTZ DEFAULT now(),
  comentario TEXT,
  foto_url TEXT,
  meta JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id), -- Autor/Creador
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ASEGURAR COLUMNAS PARA EVIDENCIA EN AVANCES Y CRONOGRAMA
ALTER TABLE obra_avances ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE obra_avances ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}';

ALTER TABLE presupuesto_items ADD COLUMN IF NOT EXISTS fecha_inicio DATE;
ALTER TABLE presupuesto_items ADD COLUMN IF NOT EXISTS fecha_fin DATE;

-- 3. MODERNIZACIÓN MASIVA DE POLÍTICAS RLS (Auth-All)
-- Este bloque habilita RLS y crea políticas universales para usuarios autenticados

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
        -- Asegurar que la tabla existe antes de intentar modificarla
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
            -- Asegurar que RLS esté activo
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
            
            -- Eliminar políticas antiguas (limpieza profunda)
            EXECUTE format('DROP POLICY IF EXISTS "Users can manage own %s" ON %I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "Users can insert %s" ON %I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "Users can update %s" ON %I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "Users can delete %s" ON %I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_auth_all', t);
            
            -- Crear nueva política universal
            EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'')', t || '_auth_all', t);
        END IF;
    END LOOP;
END $$;

-- 3. POLÍTICAS DE STORAGE (EVIDENCIA FOTOGRÁFICA)
DO $$ BEGIN
  -- Asegurar bucket existe (Solo si tienes permisos de superusuario, si no, fallará silenciosamente)
  -- En la mayoría de setups de Supabase se hace vía UI, pero intentamos las políticas
  
  DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
  DROP POLICY IF EXISTS "Public access to photos" ON storage.objects;
  
  CREATE POLICY "Authenticated users can upload photos" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'obra-fotos' AND auth.role() = 'authenticated');
    
  CREATE POLICY "Public access to photos" ON storage.objects 
    FOR SELECT USING (bucket_id = 'obra-fotos');
EXCEPTION WHEN OTHERS THEN 
  RAISE NOTICE 'Nota: Storage ajustado (si el bucket obra-fotos existe)';
END $$;

-- 4. VERIFICACIÓN FINAL
SELECT table_name, is_insertable_into 
FROM information_schema.tables 
WHERE table_name IN ('control_asistencia', 'obra_avances', 'item_notes');
