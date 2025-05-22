-- Enable Row Level Security and allow all actions for development

-- Enable RLS on tables
alter table public.assets enable row level security;
alter table storage.objects enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Allow all select" on public.assets;
drop policy if exists "Allow all insert" on public.assets;
drop policy if exists "Allow all update" on public.assets;
drop policy if exists "Allow all delete" on public.assets;
drop policy if exists "Allow all for dev" on storage.objects;

-- Create policies for public.assets
create policy "Allow all select" on public.assets
    for select
    using (true);

create policy "Allow all insert" on public.assets
    for insert
    with check (true);

create policy "Allow all update" on public.assets
    for update
    using (true)
    with check (true);

create policy "Allow all delete" on public.assets
    for delete
    using (true);

-- Create policies for storage.objects
create policy "Allow all for dev" on storage.objects
    for all
    using (true)
    with check (true); 