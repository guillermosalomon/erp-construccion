-- ==============================================================================
-- CORRECCIÓN CRÍTICA DE POLÍTICAS DE SEGURIDAD (RLS) PARA EL MARKETPLACE
-- Este script soluciona el problema de "Fallo borrado silencioso (0 filas)"
-- que ocurre cuando Supabase bloquea internamente la eliminación de registros.
-- ==============================================================================

-- 1. Asegurar que RLS esté activo
ALTER TABLE mk_tiendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mk_puntos_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE mk_ofertas ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar cualquier política anterior que pueda estar incompleta o limitando el borrado
DROP POLICY IF EXISTS "Users can manage own mk_tiendas" ON mk_tiendas;
DROP POLICY IF EXISTS "Users can delete own mk_tiendas" ON mk_tiendas;
DROP POLICY IF EXISTS "Users can manage own mk_puntos_venta" ON mk_puntos_venta;
DROP POLICY IF EXISTS "Users can delete own mk_puntos_venta" ON mk_puntos_venta;
DROP POLICY IF EXISTS "Users can manage own mk_ofertas" ON mk_ofertas;
DROP POLICY IF EXISTS "Users can delete own mk_ofertas" ON mk_ofertas;

-- 3. Crear políticas EXPLÍCITAS para cada operación (Select, Insert, Update, Delete)
-- De esta forma garantizamos al 100% que el usuario dueño puede hacer TODO.

-- Políticas para TIENDAS
CREATE POLICY "Select_mk_tiendas" ON mk_tiendas FOR SELECT USING (true);
CREATE POLICY "Insert_mk_tiendas" ON mk_tiendas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update_mk_tiendas" ON mk_tiendas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Delete_mk_tiendas" ON mk_tiendas FOR DELETE USING (auth.uid() = user_id);

-- Políticas para PUNTOS DE VENTA
CREATE POLICY "Select_mk_puntos_venta" ON mk_puntos_venta FOR SELECT USING (true);
CREATE POLICY "Insert_mk_puntos_venta" ON mk_puntos_venta FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update_mk_puntos_venta" ON mk_puntos_venta FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Delete_mk_puntos_venta" ON mk_puntos_venta FOR DELETE USING (auth.uid() = user_id);

-- Políticas para OFERTAS
CREATE POLICY "Select_mk_ofertas" ON mk_ofertas FOR SELECT USING (true);
CREATE POLICY "Insert_mk_ofertas" ON mk_ofertas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update_mk_ofertas" ON mk_ofertas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Delete_mk_ofertas" ON mk_ofertas FOR DELETE USING (auth.uid() = user_id);

-- Verificar que se crearon exitosamente (opcional, visible en consola)
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('mk_tiendas', 'mk_puntos_venta', 'mk_ofertas');
