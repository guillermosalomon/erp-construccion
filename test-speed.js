const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://hnbssxtdagzrbedrdynn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYnNzeHRkYWd6cmJlZHJkeW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTk2NzMsImV4cCI6MjA5MTkzNTY3M30.hKyFG4CVN8H3-bbpQQUn9zPdzhPIRGaRGz_mqu50oyo'
);

async function main() {
  console.log('Probando conexión a Supabase...');
  const start = Date.now();
  
  try {
    const { data, error } = await Promise.race([
      supabase.from('categorias').select('id').limit(1),
      new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT 5s')), 5000))
    ]);
    
    const ms = Date.now() - start;
    if (error) {
      console.log(`❌ Error (${ms}ms):`, error.message);
    } else {
      console.log(`✅ Supabase ONLINE (${ms}ms)`);
    }
  } catch (e) {
    console.log(`❌ ${e.message} — Supabase sigue caído.`);
  }
}

main();
