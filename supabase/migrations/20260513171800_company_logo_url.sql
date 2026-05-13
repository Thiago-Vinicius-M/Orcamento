-- Path relativo ao bucket privado `company-logos` (nunca URL pública absoluta do Supabase/CDN).
alter table public.companies add column if not exists logo_url text;

comment on column public.companies.logo_url is
  'Caminho do objeto no bucket Storage company-logos (ex.: {company_id}/{uuid}.webp). Não armazenar URL absoluta do Supabase/CDN.';

-- ---------------------------------------------------------------------------
-- Storage: bucket `company-logos` (privado) + policies em storage.objects.
-- RLS já vem habilitado por padrão em storage.objects no Supabase; o
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY exige ser owner da tabela
-- (supabase_storage_admin), o que não é o caso ao rodar migrations.
-- Upsert no cliente exige políticas INSERT + SELECT + UPDATE no mesmo prefixo.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-logos',
  'company-logos',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "company_logos_select_own_company" on storage.objects;
drop policy if exists "company_logos_insert_gerente_own_prefix" on storage.objects;
drop policy if exists "company_logos_update_gerente_own_prefix" on storage.objects;
drop policy if exists "company_logos_delete_gerente_own_prefix" on storage.objects;

create policy "company_logos_select_own_company"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'company-logos'
    and split_part(name, '/', 1) = public.current_company_id()::text
    and public.current_role() in ('gerente', 'vendedor')
  );

create policy "company_logos_insert_gerente_own_prefix"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'company-logos'
    and split_part(name, '/', 1) = public.current_company_id()::text
    and public.current_role() = 'gerente'
  );

create policy "company_logos_update_gerente_own_prefix"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'company-logos'
    and split_part(name, '/', 1) = public.current_company_id()::text
    and public.current_role() = 'gerente'
  )
  with check (
    bucket_id = 'company-logos'
    and split_part(name, '/', 1) = public.current_company_id()::text
    and public.current_role() = 'gerente'
  );

create policy "company_logos_delete_gerente_own_prefix"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'company-logos'
    and split_part(name, '/', 1) = public.current_company_id()::text
    and public.current_role() = 'gerente'
  );
