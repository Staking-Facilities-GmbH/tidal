-- Create assets table
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL NOT NULL,
    tags TEXT[] DEFAULT '{}',
    file_url TEXT,
    creator_address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable full access for all users" ON public.assets;

-- Create policies
CREATE POLICY "Enable full access for all users" ON public.assets
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON public.assets TO anon;
GRANT ALL ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER handle_assets_updated_at
    BEFORE UPDATE ON public.assets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Insert test data
INSERT INTO public.assets (name, description, price, tags, file_url, creator_address)
VALUES (
    'Test Asset',
    'A test asset for development',
    1.00,
    ARRAY['test', 'development'],
    'https://example.com/test.jpg',
    '0x0000000000000000000000000000000000000000'
); 