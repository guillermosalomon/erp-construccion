const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hnbssxtdagzrbedrdynn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYnNzeHRkYWd6cmJlZHJkeW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTk2NzMsImV4cCI6MjA5MTkzNTY3M30.hKyFG4CVN8H3-bbpQQUn9zPdzhPIRGaRGz_mqu50oyo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runMigration() {
    console.log('🔄 Running marketing_leads migration...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
            -- Marketing leads table
            CREATE TABLE IF NOT EXISTS marketing_leads (
                id BIGSERIAL PRIMARY KEY,
                nombre TEXT NOT NULL,
                telefono TEXT NOT NULL,
                email TEXT,
                servicio TEXT NOT NULL,
                ciudad TEXT,
                mensaje TEXT,
                gclid TEXT,
                msclkid TEXT,
                utm_source TEXT,
                utm_medium TEXT,
                utm_campaign TEXT,
                utm_term TEXT,
                utm_content TEXT,
                landing_page TEXT,
                fuente TEXT DEFAULT 'organico',
                estado TEXT DEFAULT 'nuevo',
                asignado_a TEXT,
                valor_estimado NUMERIC,
                notas TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                contactado_at TIMESTAMPTZ,
                cerrado_at TIMESTAMPTZ,
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `
    });

    if (error) {
        console.log('⚠️  RPC exec_sql not available, trying direct approach...');
        // Try inserting a test record to see if table exists
        const { error: testError } = await supabase
            .from('marketing_leads')
            .select('id')
            .limit(1);
        
        if (testError && testError.message.includes('does not exist')) {
            console.log('❌ Table does not exist. Please run the SQL migration manually.');
            console.log('📋 Go to: https://supabase.com/dashboard/project/hnbssxtdagzrbedrdynn/sql');
            console.log('📋 And paste the contents of: migration-marketing-leads.sql');
        } else if (testError) {
            console.log('❌ Error:', testError.message);
        } else {
            console.log('✅ Table marketing_leads already exists!');
        }
    } else {
        console.log('✅ Migration executed successfully!');
    }
}

runMigration().catch(console.error);
