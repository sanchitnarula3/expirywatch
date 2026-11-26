drop policy if exists "profiles_select_policy" on public.profiles;
create policy "profiles_select_policy"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or public.get_current_user_role() = 'admin'
  or (
    public.get_current_user_role() = 'dept_head'
    and department = public.get_current_user_department()
  )
);

create or replace function public.get_document_uploaders()
returns table (document_id uuid, uploader_name text)
language sql
security definer
set search_path = public
stable
as $$
  select d.id, p.full_name
  from public.documents d
  join public.profiles p on p.id = d.owner_id
  where public.get_current_user_role() = 'admin'
     or d.department = public.get_current_user_department();
$$;

revoke all on function public.get_document_uploaders() from public;
grant execute on function public.get_document_uploaders() to authenticated;

drop policy if exists "Authenticated users can upload documents" on storage.objects;
create policy "Authenticated users can upload documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documents'
  and (
    public.get_current_user_role() = 'admin'
    or lower((storage.foldername(name))[1]) = lower(public.get_current_user_department())
  )
);

drop policy if exists "Authorized users can delete documents" on storage.objects;
create policy "Authorized users can delete documents"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'documents'
  and public.get_current_user_role() in ('admin', 'dept_head')
  and (
    public.get_current_user_role() = 'admin'
    or lower((storage.foldername(name))[1]) = lower(public.get_current_user_department())
  )
);
