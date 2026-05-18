const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkColumns() {
  const { data, error } = await supabase.from('chat_usuarios').select('*').limit(1);
  if (error) {
    console.error('Error selecting from chat_usuarios:', error.message);
    return;
  }
  if (data && data.length > 0) {
    console.log('Columnas encontradas:', Object.keys(data[0]));
  } else {
    console.log('No hay datos en chat_usuarios para inferir columnas.');
  }
}

checkColumns();
