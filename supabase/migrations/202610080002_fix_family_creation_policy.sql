-- Consente al creatore di leggere la famiglia appena inserita.
-- Serve anche per INSERT ... RETURNING usato dal client Supabase.

drop policy if exists "families_select_members" on public.families;

create policy "families_select_members"
on public.families for select
to authenticated
using (
  created_by = auth.uid()
  or public.is_family_member(id)
);
