const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hnbssxtdagzrbedrdynn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYnNzeHRkYWd6cmJlZHJkeW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTk2NzMsImV4cCI6MjA5MTkzNTY3M30.hKyFG4CVN8H3-bbpQQUn9zPdzhPIRGaRGz_mqu50oyo';
const EMAIL = 'guillermosalomonsolarte@gmail.com';
const PASSWORD = 'l043211?';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (authErr) { console.error('Auth:', authErr.message); process.exit(1); }

  // Get all cargo_detalle
  const { data: detalles } = await supabase.from('cargo_detalle').select('*');
  console.log(`Total cargo_detalle: ${detalles?.length || 0}`);

  if (!detalles || detalles.length === 0) return;

  // Find duplicates (same cargo_padre_id + cargo_hijo_id)
  const seen = new Map();
  const toDelete = [];

  for (const d of detalles) {
    const key = `${d.cargo_padre_id}|${d.cargo_hijo_id}`;
    if (seen.has(key)) {
      toDelete.push(d.id); // Delete the duplicate
    } else {
      seen.set(key, d);
    }
  }

  console.log(`Duplicados a eliminar: ${toDelete.length}`);
  
  for (const id of toDelete) {
    const { error } = await supabase.from('cargo_detalle').delete().eq('id', id);
    if (error) console.error(`Error eliminando ${id}:`, error.message);
    else process.stdout.write('.');
  }

  // Show remaining
  const { data: remaining } = await supabase.from('cargo_detalle').select('*');
  console.log(`\n✅ Cargo detalle restantes: ${remaining?.length || 0}`);
  remaining?.forEach(d => console.log(`  ${d.cargo_padre_id} -> ${d.cargo_hijo_id} (factor: ${d.factor_smlv})`));
}

main().catch(err => console.error('Fatal:', err));
