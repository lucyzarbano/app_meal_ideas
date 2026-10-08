-- Duplica una ricetta leggibile nella raccolta privata della famiglia.

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
  new_recipe_id uuid;
begin
  if auth.uid() is null or not public.is_family_member(p_family_id) then
    raise exception 'Non hai accesso a questa famiglia.';
  end if;

  if not public.can_read_recipe(p_recipe_id) then
    raise exception 'La ricetta non è disponibile.';
  end if;

  select * into source_recipe
  from public.recipes
  where id = p_recipe_id;

  insert into public.recipes (
    family_id, created_by, parent_recipe_id, title, description, source, visibility, servings,
    prep_minutes, cook_minutes, difficulty, meal_types, main_protein, tags,
    image_url, image_key, nutrition_verified
  ) values (
    p_family_id,
    auth.uid(),
    p_recipe_id,
    coalesce(nullif(trim(p_title), ''), source_recipe.title || ' · versione di famiglia'),
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
  select
    new_recipe_id, ingredient_id, quantity, unit, preparation, is_optional, sort_order
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
