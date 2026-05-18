ALTER TABLE mk_tiendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mk_puntos_venta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read mk_tiendas" ON mk_tiendas;
DROP POLICY IF EXISTS "Anyone can read mk_puntos_venta" ON mk_puntos_venta;

CREATE POLICY "Anyone can read mk_tiendas" ON mk_tiendas FOR SELECT USING (true);
CREATE POLICY "Anyone can read mk_puntos_venta" ON mk_puntos_venta FOR SELECT USING (true);
