-- =============================================
-- Migration: Marketing Leads Table
-- For Kalarti Marketing Module
-- =============================================

-- Marketing leads table
CREATE TABLE IF NOT EXISTS marketing_leads (
    id BIGSERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono TEXT NOT NULL,
    email TEXT,
    servicio TEXT NOT NULL,
    ciudad TEXT,
    mensaje TEXT,
    
    -- Tracking / Attribution
    gclid TEXT,           -- Google Click ID
    msclkid TEXT,         -- Microsoft Click ID
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    landing_page TEXT,
    fuente TEXT DEFAULT 'organico', -- google_ads, microsoft_ads, organico, whatsapp, telegram
    
    -- Lead lifecycle
    estado TEXT DEFAULT 'nuevo', -- nuevo, contactado, cotizado, en_negociacion, cerrado_ganado, cerrado_perdido
    asignado_a TEXT,       -- Team member assigned
    valor_estimado NUMERIC, -- Estimated project value in COP
    notas TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    contactado_at TIMESTAMPTZ,
    cerrado_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_marketing_leads_estado ON marketing_leads(estado);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_fuente ON marketing_leads(fuente);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_servicio ON marketing_leads(servicio);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_created ON marketing_leads(created_at DESC);

-- Enable RLS
ALTER TABLE marketing_leads ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read all leads
CREATE POLICY "Authenticated users can read marketing leads"
    ON marketing_leads FOR SELECT
    TO authenticated
    USING (true);

-- Policy: authenticated users can insert leads
CREATE POLICY "Authenticated users can insert marketing leads"
    ON marketing_leads FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow anonymous inserts (from landing page forms)
CREATE POLICY "Anonymous can insert marketing leads"
    ON marketing_leads FOR INSERT
    TO anon
    WITH CHECK (true);

-- Policy: authenticated users can update leads
CREATE POLICY "Authenticated users can update marketing leads"
    ON marketing_leads FOR UPDATE
    TO authenticated
    USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_marketing_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_marketing_leads_updated_at
    BEFORE UPDATE ON marketing_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_marketing_leads_updated_at();

-- View for lead analytics
CREATE OR REPLACE VIEW marketing_leads_analytics AS
SELECT 
    fuente,
    servicio,
    estado,
    COUNT(*) as total_leads,
    COUNT(CASE WHEN estado = 'cerrado_ganado' THEN 1 END) as leads_ganados,
    ROUND(
        COUNT(CASE WHEN estado = 'cerrado_ganado' THEN 1 END)::NUMERIC / 
        NULLIF(COUNT(*), 0) * 100, 
        2
    ) as tasa_conversion,
    SUM(CASE WHEN estado = 'cerrado_ganado' THEN valor_estimado ELSE 0 END) as valor_total,
    DATE_TRUNC('month', created_at) as mes
FROM marketing_leads
GROUP BY fuente, servicio, estado, DATE_TRUNC('month', created_at)
ORDER BY mes DESC, total_leads DESC;
