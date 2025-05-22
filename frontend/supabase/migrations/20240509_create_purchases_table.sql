-- Create purchases table to track asset purchases by user
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    user_address TEXT NOT NULL,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Create policies for development
CREATE POLICY "Allow all select" ON public.purchases FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.purchases FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.purchases FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete" ON public.purchases FOR DELETE USING (true);

-- Grant necessary permissions
GRANT ALL ON public.purchases TO anon;
GRANT ALL ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role; 