-- ============================================================
-- FASE 20c — Ajustes de seguridad (RLS) para pedidos web y pagos
-- Ejecutar DESPUÉS de migration-fase20-red-logistica.sql. Idempotente.
-- ============================================================

-- 1. El comprador ya no puede editar su pedido (la política antigua FOR ALL lo permitía)
DROP POLICY IF EXISTS "Users can manage own mk_pedidos" ON mk_pedidos;

-- 2. Pagos: el comprador registra su pago (pendiente o en revisión con comprobante); el personal lo confirma
ALTER TABLE pagos_plataforma ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comprador_registra_pago_marketplace" ON pagos_plataforma;
CREATE POLICY "comprador_registra_pago_marketplace" ON pagos_plataforma FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND estado IN ('pendiente', 'en_revision'));
DROP POLICY IF EXISTS "comprador_adjunta_comprobante" ON pagos_plataforma;
CREATE POLICY "comprador_adjunta_comprobante" ON pagos_plataforma FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND estado IN ('pendiente', 'en_revision'))
  WITH CHECK (user_id = auth.uid() AND estado IN ('pendiente', 'en_revision'));
DROP POLICY IF EXISTS "staff_gestiona_pagos" ON pagos_plataforma;
CREATE POLICY "staff_gestiona_pagos" ON pagos_plataforma FOR ALL TO authenticated
  USING (kalarti_es_staff()) WITH CHECK (kalarti_es_staff());
DROP POLICY IF EXISTS "usuario_ve_sus_pagos" ON pagos_plataforma;
CREATE POLICY "usuario_ve_sus_pagos" ON pagos_plataforma FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR kalarti_es_staff());

-- 3. Bucket de comprobantes (privado: solo el dueño y el personal lo leen)
INSERT INTO storage.buckets (id, name, public) VALUES ('comprobantes', 'comprobantes', false)
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "comprobantes_subir" ON storage.objects;
CREATE POLICY "comprobantes_subir" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprobantes');
DROP POLICY IF EXISTS "comprobantes_leer" ON storage.objects;
CREATE POLICY "comprobantes_leer" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'comprobantes' AND (owner = auth.uid() OR kalarti_es_staff()));
