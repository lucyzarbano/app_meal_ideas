-- Tavola: ricette, pianificazione, alternative e abitudini alimentari.

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,
  display_name text not null,
  category text,
  allergen_key text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  parent_recipe_id uuid references public.recipes(id) on delete set null,
  title text not null check (char_length(title) between 1 and 140),
  description text,
  source text not null default 'custom' check (source in ('catalog', 'custom')),
  visibility text not null default 'family' check (visibility in ('public', 'family', 'private')),
  servings smallint not null default 4 check (servings between 1 and 30),
  prep_minutes smallint check (prep_minutes >= 0),
  cook_minutes smallint check (cook_minutes >= 0),
  difficulty text check (difficulty in ('easy', 'medium', 'advanced')),
  meal_types text[] not null default '{}',
  main_protein text check (main_protein in ('fish', 'meat', 'eggs', 'legumes', 'dairy', 'plant', 'mixed')),
  tags text[] not null default '{}',
  image_url text,
  image_key text,
  nutrition_verified boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (family_id is not null or visibility <> 'family')
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id),
  quantity numeric(10, 2) check (quantity > 0),
  unit text,
  preparation text,
  is_optional boolean not null default false,
  sort_order smallint not null default 0
);

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  step_number smallint not null check (step_number > 0),
  instruction text not null,
  duration_minutes smallint check (duration_minutes >= 0),
  unique (recipe_id, step_number)
);

create table public.recipe_nutrition (
  recipe_id uuid primary key references public.recipes(id) on delete cascade,
  calories_kcal numeric(8, 2) check (calories_kcal >= 0),
  protein_g numeric(8, 2) check (protein_g >= 0),
  carbohydrate_g numeric(8, 2) check (carbohydrate_g >= 0),
  fat_g numeric(8, 2) check (fat_g >= 0),
  fibre_g numeric(8, 2) check (fibre_g >= 0),
  sodium_mg numeric(8, 2) check (sodium_mg >= 0),
  source_label text,
  source_url text,
  verified_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.recipe_ratings (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  member_id uuid not null references public.family_members(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (recipe_id, member_id)
);

create table public.weekly_menus (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  week_start date not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (family_id, week_start)
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  weekly_menu_id uuid not null references public.weekly_menus(id) on delete cascade,
  meal_date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'snack', 'lunch', 'dinner')),
  primary_recipe_id uuid references public.recipes(id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (weekly_menu_id, meal_date, meal_type)
);

create table public.menu_item_choices (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  member_id uuid not null references public.family_members(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  choice_type text not null default 'primary' check (choice_type in ('primary', 'alternative')),
  reason text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (menu_item_id, member_id)
);

create table public.meal_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  member_id uuid not null references public.family_members(id) on delete cascade,
  event_type text not null check (event_type in ('planned', 'cooked', 'eaten', 'skipped', 'rejected')),
  portion_eaten_percent smallint check (portion_eaten_percent between 0 and 100),
  leftover_percent smallint check (leftover_percent between 0 and 100),
  rejection_reason text,
  notes text,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_by uuid not null default auth.uid() references auth.users(id)
);

create index recipes_family_id_idx on public.recipes(family_id);
create index recipes_created_by_idx on public.recipes(created_by);
create index recipes_parent_recipe_id_idx on public.recipes(parent_recipe_id);
create index recipe_ingredients_recipe_id_idx on public.recipe_ingredients(recipe_id);
create unique index recipe_ingredients_unique_preparation_idx
on public.recipe_ingredients (recipe_id, ingredient_id, coalesce(preparation, ''));
create index recipe_ratings_recipe_id_idx on public.recipe_ratings(recipe_id);
create index recipe_ratings_member_id_idx on public.recipe_ratings(member_id);
create index weekly_menus_family_week_idx on public.weekly_menus(family_id, week_start);
create index menu_items_menu_date_idx on public.menu_items(weekly_menu_id, meal_date);
create index meal_events_family_date_idx on public.meal_events(family_id, occurred_at desc);
create index meal_events_member_idx on public.meal_events(member_id);

create trigger recipes_set_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();

create trigger nutrition_set_updated_at
before update on public.recipe_nutrition
for each row execute function public.set_updated_at();

create trigger recipe_ratings_set_updated_at
before update on public.recipe_ratings
for each row execute function public.set_updated_at();

create trigger weekly_menus_set_updated_at
before update on public.weekly_menus
for each row execute function public.set_updated_at();

create trigger menu_items_set_updated_at
before update on public.menu_items
for each row execute function public.set_updated_at();

create or replace function public.can_read_recipe(target_recipe_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.recipes recipe
    where recipe.id = target_recipe_id
      and (
        recipe.visibility = 'public'
        or recipe.created_by = auth.uid()
        or (recipe.visibility = 'family' and public.is_family_member(recipe.family_id))
      )
  );
$$;

create or replace function public.can_edit_recipe(target_recipe_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.recipes recipe
    where recipe.id = target_recipe_id
      and (
        recipe.created_by = auth.uid()
        or public.is_family_admin(recipe.family_id)
      )
  );
$$;

create or replace function public.can_manage_member(target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members member
    where member.id = target_member_id
      and public.is_family_member(member.family_id)
  );
$$;

create or replace function public.member_belongs_to_family(target_member_id uuid, target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members member
    where member.id = target_member_id
      and member.family_id = target_family_id
      and public.is_family_member(target_family_id)
  );
$$;

create or replace function public.can_access_menu(target_menu_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.weekly_menus menu
    where menu.id = target_menu_id
      and public.is_family_member(menu.family_id)
  );
$$;

create or replace function public.can_access_menu_item(target_menu_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.menu_items item
    where item.id = target_menu_item_id
      and public.can_access_menu(item.weekly_menu_id)
  );
$$;

create or replace function public.valid_menu_choice(target_menu_item_id uuid, target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.menu_items item
    join public.weekly_menus menu on menu.id = item.weekly_menu_id
    join public.family_members member on member.id = target_member_id
    where item.id = target_menu_item_id
      and member.family_id = menu.family_id
      and public.is_family_member(menu.family_id)
  );
$$;

create or replace function public.menu_item_belongs_to_family(target_menu_item_id uuid, target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.menu_items item
    join public.weekly_menus menu on menu.id = item.weekly_menu_id
    where item.id = target_menu_item_id
      and menu.family_id = target_family_id
      and public.is_family_member(target_family_id)
  );
$$;

alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_nutrition enable row level security;
alter table public.recipe_ratings enable row level security;
alter table public.weekly_menus enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_item_choices enable row level security;
alter table public.meal_events enable row level security;

create policy "ingredients_read_authenticated"
on public.ingredients for select to authenticated using (true);

create policy "ingredients_insert_authenticated"
on public.ingredients for insert to authenticated with check (true);

create policy "recipes_read_allowed"
on public.recipes for select to authenticated
using (
  visibility = 'public'
  or created_by = auth.uid()
  or (visibility = 'family' and public.is_family_member(family_id))
);

create policy "recipes_insert_allowed"
on public.recipes for insert to authenticated
with check (
  created_by = auth.uid()
  and source = 'custom'
  and (family_id is null or public.is_family_member(family_id))
);

create policy "recipes_update_allowed"
on public.recipes for update to authenticated
using (public.can_edit_recipe(id))
with check (created_by = auth.uid() or public.is_family_admin(family_id));

create policy "recipes_delete_allowed"
on public.recipes for delete to authenticated
using (public.can_edit_recipe(id));

create policy "recipe_ingredients_read"
on public.recipe_ingredients for select to authenticated
using (public.can_read_recipe(recipe_id));

create policy "recipe_ingredients_write"
on public.recipe_ingredients for all to authenticated
using (public.can_edit_recipe(recipe_id))
with check (public.can_edit_recipe(recipe_id));

create policy "recipe_steps_read"
on public.recipe_steps for select to authenticated
using (public.can_read_recipe(recipe_id));

create policy "recipe_steps_write"
on public.recipe_steps for all to authenticated
using (public.can_edit_recipe(recipe_id))
with check (public.can_edit_recipe(recipe_id));

create policy "recipe_nutrition_read"
on public.recipe_nutrition for select to authenticated
using (public.can_read_recipe(recipe_id));

create policy "recipe_nutrition_write"
on public.recipe_nutrition for all to authenticated
using (public.can_edit_recipe(recipe_id))
with check (public.can_edit_recipe(recipe_id));

create policy "recipe_ratings_read"
on public.recipe_ratings for select to authenticated
using (public.can_read_recipe(recipe_id) and public.can_manage_member(member_id));

create policy "recipe_ratings_insert"
on public.recipe_ratings for insert to authenticated
with check (public.can_read_recipe(recipe_id) and public.can_manage_member(member_id));

create policy "recipe_ratings_update"
on public.recipe_ratings for update to authenticated
using (public.can_read_recipe(recipe_id) and public.can_manage_member(member_id))
with check (public.can_read_recipe(recipe_id) and public.can_manage_member(member_id));

create policy "recipe_ratings_delete"
on public.recipe_ratings for delete to authenticated
using (public.can_read_recipe(recipe_id) and public.can_manage_member(member_id));

create policy "weekly_menus_read"
on public.weekly_menus for select to authenticated
using (public.is_family_member(family_id));

create policy "weekly_menus_insert"
on public.weekly_menus for insert to authenticated
with check (created_by = auth.uid() and public.is_family_member(family_id));

create policy "weekly_menus_update"
on public.weekly_menus for update to authenticated
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

create policy "weekly_menus_delete"
on public.weekly_menus for delete to authenticated
using (public.is_family_admin(family_id));

create policy "menu_items_read"
on public.menu_items for select to authenticated
using (public.can_access_menu(weekly_menu_id));

create policy "menu_items_write"
on public.menu_items for all to authenticated
using (public.can_access_menu(weekly_menu_id))
with check (
  public.can_access_menu(weekly_menu_id)
  and (primary_recipe_id is null or public.can_read_recipe(primary_recipe_id))
);

create policy "menu_choices_read"
on public.menu_item_choices for select to authenticated
using (
  public.valid_menu_choice(menu_item_id, member_id)
  and public.can_read_recipe(recipe_id)
);

create policy "menu_choices_write"
on public.menu_item_choices for all to authenticated
using (
  public.valid_menu_choice(menu_item_id, member_id)
)
with check (
  public.valid_menu_choice(menu_item_id, member_id)
  and public.can_read_recipe(recipe_id)
);

create policy "meal_events_read"
on public.meal_events for select to authenticated
using (public.is_family_member(family_id));

create policy "meal_events_insert"
on public.meal_events for insert to authenticated
with check (
  created_by = auth.uid()
  and public.is_family_member(family_id)
  and public.member_belongs_to_family(member_id, family_id)
  and (menu_item_id is null or public.menu_item_belongs_to_family(menu_item_id, family_id))
  and public.can_read_recipe(recipe_id)
);

create policy "meal_events_update"
on public.meal_events for update to authenticated
using (created_by = auth.uid() and public.is_family_member(family_id))
with check (created_by = auth.uid() and public.is_family_member(family_id));

create policy "meal_events_delete"
on public.meal_events for delete to authenticated
using (created_by = auth.uid() or public.is_family_admin(family_id));

grant execute on function public.can_read_recipe(uuid) to authenticated;
grant execute on function public.can_edit_recipe(uuid) to authenticated;
grant execute on function public.can_manage_member(uuid) to authenticated;
grant execute on function public.member_belongs_to_family(uuid, uuid) to authenticated;
grant execute on function public.can_access_menu(uuid) to authenticated;
grant execute on function public.can_access_menu_item(uuid) to authenticated;
grant execute on function public.valid_menu_choice(uuid, uuid) to authenticated;
grant execute on function public.menu_item_belongs_to_family(uuid, uuid) to authenticated;
