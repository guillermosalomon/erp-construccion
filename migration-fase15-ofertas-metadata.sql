-- Add marca and codigo_propio to mk_ofertas
ALTER TABLE mk_ofertas 
ADD COLUMN IF NOT EXISTS marca TEXT,
ADD COLUMN IF NOT EXISTS codigo_propio TEXT;

NOTIFY pgrst, 'reload schema';
