-- Create the 'assets' storage bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing; 