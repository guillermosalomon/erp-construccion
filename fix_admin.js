require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixAdmin() {
  const email = 'gsalo90@outlook.com';
  console.log(`Intentando restaurar rol admin para: ${email}`);
  
  const { data, error } = await supabase
    .from('personal')
    .update({ app_role: 'admin' })
    .eq('email', email)
    .select();

  if (error) {
    console.error('Error actualizando rol:', error.message);
    process.exit(1);
  }

  console.log('Rol actualizado correctamente:', data);
  process.exit(0);
}

fixAdmin();
