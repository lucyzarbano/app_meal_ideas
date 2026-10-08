-- Aggiorna ricetta, ingredienti e passaggi in una singola transazione.

create or replace function public.update_custom_recipe(
  p_recipe_id uuid,
  p_title text,
  p_description text,
  p_servings smallint,
  p_prep_minutes smallint,
  p_cook_minutes smallint,
  p_difficulty text,
  p_main_protein text,
  p_ingredients jsonb,
  p_steps jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ingredient_item jsonb;
  ingredient_record_id uuid;
  step_item jsonb;
  item_index integer := 0;
begin
  if auth.uid() is null or not public.can_edit_recipe(p_recipe_id) then
    raise exception 'Non hai il permesso di modificare questa ricetta.';
  end if;

  if not exists (select 1 from public.recipes where id = p_recipe_id and source = 'custom') then
    raise exception 'Prima crea una copia personale della ricetta di catalogo.';
  end if;

  if nullif(trim(p_title), '') is null then
    raise exception 'Il titolo della ricetta è obbligatorio.';
  end if;

  if jsonb_typeof(p_ingredients) <> 'array' or jsonb_array_length(p_ingredients) = 0 then
    raise exception 'Inserisci almeno un ingrediente.';
  end if;

  if jsonb_typeof(p_steps) <> 'array' or jsonb_array_length(p_steps) = 0 then
    raise exception 'Inserisci almeno un passaggio.';
  end if;

  update public.recipes set
    title = trim(p_title),
    description = nullif(trim(p_description), ''),
    servings = coalesce(p_servings, 4),
    prep_minutes = p_prep_minutes,
    cook_minutes = p_cook_minutes,
    difficulty = p_difficulty,
    main_protein = nullif(p_main_protein, '')
  where id = p_recipe_id;

  delete from public.recipe_ingredients where recipe_id = p_recipe_id;
  delete from public.recipe_steps where recipe_id = p_recipe_id;

  for ingredient_item in select value from jsonb_array_elements(p_ingredients)
  loop
    if nullif(trim(ingredient_item ->> 'name'), '') is not null then
      insert into public.ingredients (canonical_name, display_name)
      values (
        regexp_replace(lower(trim(ingredient_item ->> 'name')), '\s+', ' ', 'g'),
        trim(ingredient_item ->> 'name')
      )
      on conflict (canonical_name) do update set display_name = excluded.display_name
      returning id into ingredient_record_id;

      insert into public.recipe_ingredients (
        recipe_id, ingredient_id, quantity, unit, preparation, is_optional, sort_order
      ) values (
        p_recipe_id,
        ingredient_record_id,
        nullif(ingredient_item ->> 'quantity', '')::numeric,
        nullif(trim(ingredient_item ->> 'unit'), ''),
        nullif(trim(ingredient_item ->> 'preparation'), ''),
        coalesce((ingredient_item ->> 'optional')::boolean, false),
        item_index
      );
      item_index := item_index + 1;
    end if;
  end loop;

  item_index := 1;
  for step_item in select value from jsonb_array_elements(p_steps)
  loop
    if nullif(trim(step_item ->> 'instruction'), '') is not null then
      insert into public.recipe_steps (recipe_id, step_number, instruction)
      values (p_recipe_id, item_index, trim(step_item ->> 'instruction'));
      item_index := item_index + 1;
    end if;
  end loop;

  return p_recipe_id;
end;
$$;

revoke all on function public.update_custom_recipe(uuid, text, text, smallint, smallint, smallint, text, text, jsonb, jsonb) from public;
grant execute on function public.update_custom_recipe(uuid, text, text, smallint, smallint, smallint, text, text, jsonb, jsonb) to authenticated;
