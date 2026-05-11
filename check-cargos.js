const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hnbssxtdagzrbedrdynn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYnNzeHRkYWd6cmJlZHJkeW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTk2NzMsImV4cCI6MjA5MTkzNTY3M30.hKyFG4CVN8H3-bbpQQUn9zPdzhPIRGaRGz_mqu50oyo';
const EMAIL = 'guillermosalomonsolarte@gmail.com';
const PASSWORD = 'l043211?';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (authErr) { console.error('Auth error:', authErr.message); process.exit(1); }
  console.log('✅ Autenticado');

  // Test: Try to read from cargo_detalle
  console.log('\n📊 Testing cargo_detalle table...');
  const { data, error } = await supabase.from('cargo_detalle').select('*');
  if (error) {
    console.error('❌ Error leyendo cargo_detalle:', error.message, error.code);
    console.log('\nLa tabla cargo_detalle no existe o no tiene permisos RLS.');
    console.log('Necesitas crearla en Supabase Dashboard con este SQL:\n');
    console.log(`
CREATE TABLE IF NOT EXISTS cargo_detalle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo_padre_id UUID NOT NULL REFERENCES cargos(id) ON DELETE CASCADE,
  cargo_hijo_id UUID NOT NULL REFERENCES cargos(id) ON DELETE CASCADE,
  cantidad NUMERIC DEFAULT 1,
  factor_smlv NUMERIC DEFAULT 1.0,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cargo_detalle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cargo_detalle"
ON cargo_detalle FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
    `);
  } else {
    console.log(`✅ Tabla cargo_detalle existe. ${data?.length || 0} registros encontrados.`);
    if (data && data.length > 0) {
      console.log('Ejemplo:', JSON.stringify(data[0], null, 2));
    }
  }

  // Also test cargos table
  console.log('\n📊 Testing cargos table...');
  const { data: cargos, error: cargosErr } = await supabase.from('cargos').select('*');
  if (cargosErr) {
    console.error('❌ Error leyendo cargos:', cargosErr.message);
  } else {
    console.log(`✅ Tabla cargos: ${cargos?.length || 0} registros.`);
    // Check if factor_multiplicador column exists
    if (cargos?.length > 0) {
      const hasFM = 'factor_multiplicador' in cargos[0];
      console.log(`  factor_multiplicador column: ${hasFM ? '✅ EXISTS' : '❌ MISSING'}`);
      console.log(`  Columns: ${Object.keys(cargos[0]).join(', ')}`);
    }
  }
}

main().catch(err => console.error('Fatal:', err));
