-- Rimuove ingredienti duplicati e tratta preparation NULL come stringa vuota.

with duplicates as (
  select
    id,
    row_number() over (
      partition by recipe_id, ingredient_id, coalesce(preparation, '')
      order by id
    ) as duplicate_number
  from public.recipe_ingredients
)
delete from public.recipe_ingredients recipe_ingredient
using duplicates
where recipe_ingredient.id = duplicates.id
  and duplicates.duplicate_number > 1;

alter table public.recipe_ingredients
drop constraint if exists recipe_ingredients_recipe_id_ingredient_id_preparation_key;

create unique index if not exists recipe_ingredients_unique_preparation_idx
on public.recipe_ingredients (recipe_id, ingredient_id, coalesce(preparation, ''));
