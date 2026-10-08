-- Una personalizzazione familiare sostituisce visivamente la ricetta di catalogo.

alter table public.recipes
add column if not exists parent_recipe_id uuid references public.recipes(id) on delete set null;

create index if not exists recipes_parent_recipe_id_idx
on public.recipes(parent_recipe_id);

-- Collega le copie create con la convenzione usata dalla prima versione.
update public.recipes custom_recipe
set parent_recipe_id = catalog_recipe.id
from public.recipes catalog_recipe
where custom_recipe.source = 'custom'
  and custom_recipe.parent_recipe_id is null
  and catalog_recipe.source = 'catalog'
  and custom_recipe.title = catalog_recipe.title || ' · versione di famiglia';

create or replace function public.clone_recipe_for_family(
  p_recipe_id uuid,
  p_family_id uuid,
  p_title text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_recipe public.recipes%rowtype;
  existing_recipe_id uuid;
  new_recipe_id uuid;
begin
  if auth.uid() is null or not public.is_family_member(p_family_id) then
    raise exception 'Non hai accesso a questa famiglia.';
  end if;

  if not public.can_read_recipe(p_recipe_id) then
    raise exception 'La ricetta non è disponibile.';
  end if;

  select id into existing_recipe_id
  from public.recipes
  where family_id = p_family_id and parent_recipe_id = p_recipe_id
  order by created_at
  limit 1;

  if existing_recipe_id is not null then
    return existing_recipe_id;
  end if;

  select * into source_recipe
  from public.recipes
  where id = p_recipe_id;

  insert into public.recipes (
    family_id, created_by, parent_recipe_id, title, description, source,
    visibility, servings, prep_minutes, cook_minutes, difficulty, meal_types,
    main_protein, tags, image_url, image_key, nutrition_verified
  ) values (
    p_family_id,
    auth.uid(),
    p_recipe_id,
    coalesce(nullif(trim(p_title), ''), source_recipe.title),
    source_recipe.description,
    'custom',
    'family',
    source_recipe.servings,
    source_recipe.prep_minutes,
    source_recipe.cook_minutes,
    source_recipe.difficulty,
    source_recipe.meal_types,
    source_recipe.main_protein,
    source_recipe.tags,
    source_recipe.image_url,
    source_recipe.image_key,
    source_recipe.nutrition_verified
  ) returning id into new_recipe_id;

  insert into public.recipe_ingredients (
    recipe_id, ingredient_id, quantity, unit, preparation, is_optional, sort_order
  )
  select new_recipe_id, ingredient_id, quantity, unit, preparation, is_optional, sort_order
  from public.recipe_ingredients
  where recipe_id = p_recipe_id;

  insert into public.recipe_steps (recipe_id, step_number, instruction, duration_minutes)
  select new_recipe_id, step_number, instruction, duration_minutes
  from public.recipe_steps
  where recipe_id = p_recipe_id;

  insert into public.recipe_nutrition (
    recipe_id, calories_kcal, protein_g, carbohydrate_g, fat_g, fibre_g,
    sodium_mg, source_label, source_url, verified_at
  )
  select
    new_recipe_id, calories_kcal, protein_g, carbohydrate_g, fat_g, fibre_g,
    sodium_mg, source_label, source_url, verified_at
  from public.recipe_nutrition
  where recipe_id = p_recipe_id;

  return new_recipe_id;
end;
$$;

revoke all on function public.clone_recipe_for_family(uuid, uuid, text) from public;
grant execute on function public.clone_recipe_for_family(uuid, uuid, text) to authenticated;
