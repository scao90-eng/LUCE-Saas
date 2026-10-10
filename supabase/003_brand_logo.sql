-- ============================================================
-- 003 · Personalizzazione: colori dell'app e logo dell'operatore
-- Eseguire dopo 002 (è rieseguibile).
-- ============================================================

alter table public.profiles add column if not exists sidebar_color text default '#2F3A2F';
alter table public.profiles add column if not exists logo_url text;

-- Bucket pubblico per i loghi: max 2 MB, solo immagini raster.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Ogni operatore scrive solo nella propria cartella: logos/<id utente>/...
drop policy if exists "logo: lettura propri" on storage.objects;
create policy "logo: lettura propri" on storage.objects for select to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "logo: caricamento propri" on storage.objects;
create policy "logo: caricamento propri" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "logo: modifica propri" on storage.objects;
create policy "logo: modifica propri" on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "logo: eliminazione propri" on storage.objects;
create policy "logo: eliminazione propri" on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
