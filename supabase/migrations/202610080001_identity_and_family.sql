-- Tavola: identita, famiglie e profili alimentari.
-- Eseguire questa migrazione dal SQL Editor di Supabase.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.family_users (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  status text not null default 'active' check (status in ('invited', 'active')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (family_id, user_id)
);

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  linked_user_id uuid references auth.users(id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 80),
  birth_date date,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (family_id, linked_user_id)
);

create table public.member_dietary_needs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.family_members(id) on delete cascade,
  kind text not null check (kind in ('allergy', 'intolerance', 'medical')),
  item_key text not null,
  label text not null,
  severity text check (severity in ('mild', 'moderate', 'severe')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (member_id, kind, item_key)
);

create table public.member_food_preferences (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.family_members(id) on delete cascade,
  item_type text not null default 'ingredient'
    check (item_type in ('ingredient', 'category', 'texture', 'recipe')),
  item_key text not null,
  label text not null,
  preference smallint not null check (preference between -2 and 2),
  notes text,
  learned_from text not null default 'declared'
    check (learned_from in ('declared', 'rating', 'behaviour', 'inferred')),
  confidence numeric(4, 3) not null default 1
    check (confidence between 0 and 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (member_id, item_type, item_key)
);

create index family_users_user_id_idx on public.family_users(user_id);
create index family_members_family_id_idx on public.family_members(family_id);
create index dietary_needs_member_id_idx on public.member_dietary_needs(member_id);
create index food_preferences_member_id_idx on public.member_food_preferences(member_id);

create or replace function public.is_family_member(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_users
    where family_id = target_family_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.is_family_admin(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_users
    where family_id = target_family_id
      and user_id = auth.uid()
      and status = 'active'
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create or replace function public.handle_new_family()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.family_users (family_id, user_id, role, status)
  values (new.id, new.created_by, 'owner', 'active');
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger families_set_updated_at
before update on public.families
for each row execute function public.set_updated_at();

create trigger family_members_set_updated_at
before update on public.family_members
for each row execute function public.set_updated_at();

create trigger dietary_needs_set_updated_at
before update on public.member_dietary_needs
for each row execute function public.set_updated_at();

create trigger food_preferences_set_updated_at
before update on public.member_food_preferences
for each row execute function public.set_updated_at();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create trigger on_family_created
after insert on public.families
for each row execute function public.handle_new_family();

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_users enable row level security;
alter table public.family_members enable row level security;
alter table public.member_dietary_needs enable row level security;
alter table public.member_food_preferences enable row level security;

create policy "profiles_select_own"
on public.profiles for select
using (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "families_select_members"
on public.families for select
using (created_by = auth.uid() or public.is_family_member(id));

create policy "families_insert_authenticated"
on public.families for insert
to authenticated
with check (created_by = auth.uid());

create policy "families_update_admins"
on public.families for update
using (public.is_family_admin(id))
with check (public.is_family_admin(id));

create policy "families_delete_owner"
on public.families for delete
using (
  exists (
    select 1 from public.family_users
    where family_id = id
      and user_id = auth.uid()
      and role = 'owner'
      and status = 'active'
  )
);

create policy "family_users_select_family"
on public.family_users for select
using (public.is_family_member(family_id));

create policy "family_users_insert_admins"
on public.family_users for insert
with check (public.is_family_admin(family_id));

create policy "family_users_update_admins"
on public.family_users for update
using (public.is_family_admin(family_id) and role <> 'owner')
with check (public.is_family_admin(family_id) and role <> 'owner');

create policy "family_users_delete_admins"
on public.family_users for delete
using (public.is_family_admin(family_id) and role <> 'owner');

create policy "family_members_select_family"
on public.family_members for select
using (public.is_family_member(family_id));

create policy "family_members_insert_family"
on public.family_members for insert
with check (public.is_family_member(family_id));

create policy "family_members_update_family"
on public.family_members for update
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

create policy "family_members_delete_admins"
on public.family_members for delete
using (public.is_family_admin(family_id));

create policy "dietary_needs_select_family"
on public.member_dietary_needs for select
using (
  exists (
    select 1 from public.family_members member
    where member.id = member_id
      and public.is_family_member(member.family_id)
  )
);

create policy "dietary_needs_insert_family"
on public.member_dietary_needs for insert
with check (
  exists (
    select 1 from public.family_members member
    where member.id = member_id
      and public.is_family_member(member.family_id)
  )
);

create policy "dietary_needs_update_family"
on public.member_dietary_needs for update
using (
  exists (
    select 1 from public.family_members member
    where member.id = member_id
      and public.is_family_member(member.family_id)
  )
)
with check (
  exists (
    select 1 from public.family_members member
    where member.id = member_id
      and public.is_family_member(member.family_id)
  )
);

create policy "dietary_needs_delete_family"
on public.member_dietary_needs for delete
using (
  exists (
    select 1 from public.family_members member
    where member.id = member_id
      and public.is_family_member(member.family_id)
  )
);

create policy "food_preferences_select_family"
on public.member_food_preferences for select
using (
  exists (
    select 1 from public.family_members member
    where member.id = member_id
      and public.is_family_member(member.family_id)
  )
);

create policy "food_preferences_insert_family"
on public.member_food_preferences for insert
with check (
  exists (
    select 1 from public.family_members member
    where member.id = member_id
      and public.is_family_member(member.family_id)
  )
);

create policy "food_preferences_update_family"
on public.member_food_preferences for update
using (
  exists (
    select 1 from public.family_members member
    where member.id = member_id
      and public.is_family_member(member.family_id)
  )
)
with check (
  exists (
    select 1 from public.family_members member
    where member.id = member_id
      and public.is_family_member(member.family_id)
  )
);

create policy "food_preferences_delete_family"
on public.member_food_preferences for delete
using (
  exists (
    select 1 from public.family_members member
    where member.id = member_id
      and public.is_family_member(member.family_id)
  )
);

grant execute on function public.is_family_member(uuid) to authenticated;
grant execute on function public.is_family_admin(uuid) to authenticated;
