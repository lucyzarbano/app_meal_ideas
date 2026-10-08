-- Catalogo iniziale e algoritmo di raccomandazione Tavola v1.

insert into public.ingredients (id, canonical_name, display_name, category, allergen_key) values
  ('20000000-0000-4000-8000-000000000001', 'zucchine', 'Zucchine', 'vegetables', null),
  ('20000000-0000-4000-8000-000000000002', 'uova', 'Uova', 'protein', 'uova'),
  ('20000000-0000-4000-8000-000000000003', 'olio extravergine di oliva', 'Olio extravergine di oliva', 'fat', null),
  ('20000000-0000-4000-8000-000000000004', 'parmigiano', 'Parmigiano', 'dairy', 'latte'),
  ('20000000-0000-4000-8000-000000000005', 'pasta', 'Pasta', 'cereals', 'glutine'),
  ('20000000-0000-4000-8000-000000000006', 'limone', 'Limone', 'fruit', null),
  ('20000000-0000-4000-8000-000000000007', 'ceci', 'Ceci', 'legumes', null),
  ('20000000-0000-4000-8000-000000000008', 'pangrattato', 'Pangrattato', 'cereals', 'glutine'),
  ('20000000-0000-4000-8000-000000000009', 'aglio', 'Aglio', 'vegetables', null),
  ('20000000-0000-4000-8000-000000000010', 'prezzemolo', 'Prezzemolo', 'herbs', null)
on conflict (canonical_name) do update set
  display_name = excluded.display_name,
  category = coalesce(ingredients.category, excluded.category),
  allergen_key = coalesce(ingredients.allergen_key, excluded.allergen_key);

insert into public.recipes (
  id, title, description, source, visibility, servings, prep_minutes,
  cook_minutes, difficulty, meal_types, main_protein, tags, image_key
) values
  (
    '10000000-0000-4000-8000-000000000001',
    'Frittata soffice alle zucchine',
    'Una cena semplice con zucchine e uova, adatta anche da preparare in anticipo.',
    'catalog', 'public', 4, 10, 15, 'easy', array['lunch', 'dinner'],
    'eggs', array['vegetariana', 'senza glutine'], 'frittata-zucchine'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Pasta cremosa zucchine e limone',
    'Un primo piatto fresco e veloce con una crema delicata di zucchine.',
    'catalog', 'public', 4, 10, 15, 'easy', array['lunch', 'dinner'],
    'plant', array['vegetariana', 'veloce'], 'pasta-pesto'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'Polpette croccanti di ceci',
    'Polpette vegetali cotte al forno, pratiche anche per il pranzo del giorno dopo.',
    'catalog', 'public', 4, 15, 20, 'easy', array['lunch', 'dinner'],
    'legumes', array['vegetariana', 'al forno'], 'polpette-ceci'
  )
on conflict (id) do nothing;

with links(recipe_id, canonical_name, quantity, unit, sort_order) as (values
  ('10000000-0000-4000-8000-000000000001'::uuid, 'zucchine', 400::numeric, 'g', 0),
  ('10000000-0000-4000-8000-000000000001'::uuid, 'uova', 6::numeric, null, 1),
  ('10000000-0000-4000-8000-000000000001'::uuid, 'olio extravergine di oliva', 2::numeric, 'cucchiai', 2),
  ('10000000-0000-4000-8000-000000000001'::uuid, 'parmigiano', 40::numeric, 'g', 3),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'pasta', 320::numeric, 'g', 0),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'zucchine', 350::numeric, 'g', 1),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'limone', 1::numeric, null, 2),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'olio extravergine di oliva', 2::numeric, 'cucchiai', 3),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'ceci', 400::numeric, 'g', 0),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'pangrattato', 80::numeric, 'g', 1),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'aglio', 1::numeric, 'spicchio', 2),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'prezzemolo', 1::numeric, 'mazzetto', 3)
)
insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit, sort_order)
select links.recipe_id, ingredient.id, links.quantity, links.unit, links.sort_order
from links
join public.ingredients ingredient on ingredient.canonical_name = links.canonical_name
on conflict do nothing;

insert into public.recipe_steps (recipe_id, step_number, instruction) values
  ('10000000-0000-4000-8000-000000000001', 1, 'Grattugia le zucchine e falle insaporire brevemente in padella.'),
  ('10000000-0000-4000-8000-000000000001', 2, 'Sbatti le uova con il parmigiano e unisci le zucchine.'),
  ('10000000-0000-4000-8000-000000000001', 3, 'Cuoci in padella coperta, girando la frittata a metà cottura.'),
  ('10000000-0000-4000-8000-000000000002', 1, 'Cuoci la pasta e conserva una tazza di acqua di cottura.'),
  ('10000000-0000-4000-8000-000000000002', 2, 'Cuoci le zucchine e frullane una parte con olio e scorza di limone.'),
  ('10000000-0000-4000-8000-000000000002', 3, 'Manteca la pasta con la crema e poca acqua di cottura.'),
  ('10000000-0000-4000-8000-000000000003', 1, 'Schiaccia i ceci e uniscili ad aglio, prezzemolo e pangrattato.'),
  ('10000000-0000-4000-8000-000000000003', 2, 'Forma delle polpette e disponile su una teglia oliata.'),
  ('10000000-0000-4000-8000-000000000003', 3, 'Cuoci in forno fino a doratura, girandole a metà cottura.')
on conflict do nothing;

create or replace function public.recommend_recipes(
  p_family_id uuid,
  p_ingredient_names text[],
  p_member_ids uuid[] default null,
  p_limit integer default 3
)
returns table (
  recipe_id uuid,
  title text,
  description text,
  prep_minutes smallint,
  cook_minutes smallint,
  difficulty text,
  main_protein text,
  image_key text,
  match_score numeric,
  taste_score numeric,
  variety_score numeric,
  total_score numeric,
  rating_average numeric,
  rating_count bigint,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_family_member(p_family_id) then
    raise exception 'Non hai accesso a questa famiglia.';
  end if;

  return query
  with selected_members as (
    select member.id
    from public.family_members member
    where member.family_id = p_family_id
      and member.is_active
      and (coalesce(cardinality(p_member_ids), 0) = 0 or member.id = any(p_member_ids))
  ),
  available as (
    select distinct regexp_replace(lower(trim(value)), '\s+', ' ', 'g') as name
    from unnest(coalesce(p_ingredient_names, array[]::text[])) value
    where nullif(trim(value), '') is not null
  ),
  eligible as (
    select recipe.*
    from public.recipes recipe
    where recipe.visibility = 'public'
       or recipe.created_by = auth.uid()
       or (recipe.visibility = 'family' and recipe.family_id = p_family_id)
  ),
  ingredient_stats as (
    select
      recipe.id as recipe_id,
      count(recipe_ingredient.id) filter (where not recipe_ingredient.is_optional) as required_count,
      count(recipe_ingredient.id) filter (
        where not recipe_ingredient.is_optional
          and exists (select 1 from available where available.name = ingredient.canonical_name)
      ) as matched_count
    from eligible recipe
    left join public.recipe_ingredients recipe_ingredient on recipe_ingredient.recipe_id = recipe.id
    left join public.ingredients ingredient on ingredient.id = recipe_ingredient.ingredient_id
    group by recipe.id
  ),
  blocked as (
    select distinct recipe_ingredient.recipe_id
    from public.recipe_ingredients recipe_ingredient
    join public.ingredients ingredient on ingredient.id = recipe_ingredient.ingredient_id
    join selected_members selected on true
    join public.member_dietary_needs need on need.member_id = selected.id
    where regexp_replace(lower(need.item_key), '[^a-z0-9àèéìòù]+', '-', 'g') = regexp_replace(lower(ingredient.canonical_name), '[^a-z0-9àèéìòù]+', '-', 'g')
       or regexp_replace(lower(need.item_key), '[^a-z0-9àèéìòù]+', '-', 'g') = regexp_replace(lower(coalesce(ingredient.allergen_key, '')), '[^a-z0-9àèéìòù]+', '-', 'g')
  ),
  ratings as (
    select rating.recipe_id, avg(rating.rating)::numeric as average, count(*)::bigint as votes
    from public.recipe_ratings rating
    join selected_members selected on selected.id = rating.member_id
    group by rating.recipe_id
  ),
  preferences as (
    select recipe_ingredient.recipe_id, avg(preference.preference)::numeric as preference_average
    from public.recipe_ingredients recipe_ingredient
    join public.ingredients ingredient on ingredient.id = recipe_ingredient.ingredient_id
    join public.member_food_preferences preference
      on regexp_replace(lower(preference.item_key), '[^a-z0-9àèéìòù]+', '-', 'g') = regexp_replace(lower(ingredient.canonical_name), '[^a-z0-9àèéìòù]+', '-', 'g')
    join selected_members selected on selected.id = preference.member_id
    group by recipe_ingredient.recipe_id
  ),
  protein_frequency as (
    select recent_recipe.main_protein, count(*)::numeric as uses
    from public.weekly_menus menu
    join public.menu_items item on item.weekly_menu_id = menu.id
    join public.recipes recent_recipe on recent_recipe.id = item.primary_recipe_id
    where menu.family_id = p_family_id
      and item.meal_date between current_date - 13 and current_date
      and recent_recipe.main_protein is not null
    group by recent_recipe.main_protein
  ),
  recently_eaten as (
    select event.recipe_id, max(event.occurred_at) as last_eaten
    from public.meal_events event
    where event.family_id = p_family_id and event.event_type in ('cooked', 'eaten')
    group by event.recipe_id
  ),
  components as (
    select
      recipe.*,
      case when stats.required_count = 0 then 0
        else round(100.0 * stats.matched_count / stats.required_count, 1) end as ingredient_match,
      greatest(0, least(100,
        coalesce(rating.average * 20, 60) + coalesce(preference.preference_average * 10, 0)
      ))::numeric as taste,
      greatest(20,
        100 - coalesce(protein.uses * 18, 0)
        - case when eaten.last_eaten >= timezone('utc', now()) - interval '14 days' then 35 else 0 end
      )::numeric as variety,
      coalesce(rating.average, 0)::numeric as rating_average,
      coalesce(rating.votes, 0)::bigint as rating_count
    from eligible recipe
    join ingredient_stats stats on stats.recipe_id = recipe.id
    left join ratings rating on rating.recipe_id = recipe.id
    left join preferences preference on preference.recipe_id = recipe.id
    left join protein_frequency protein on protein.main_protein = recipe.main_protein
    left join recently_eaten eaten on eaten.recipe_id = recipe.id
    where not exists (select 1 from blocked where blocked.recipe_id = recipe.id)
      and (stats.matched_count > 0 or coalesce(cardinality(p_ingredient_names), 0) = 0)
  ),
  scored as (
    select components.*,
      round(components.ingredient_match * 0.45 + components.taste * 0.35 + components.variety * 0.20, 1) as total
    from components
  )
  select
    scored.id,
    scored.title,
    scored.description,
    scored.prep_minutes,
    scored.cook_minutes,
    scored.difficulty,
    scored.main_protein,
    scored.image_key,
    scored.ingredient_match,
    round(scored.taste, 1),
    round(scored.variety, 1),
    scored.total,
    round(scored.rating_average, 1),
    scored.rating_count,
    case
      when scored.ingredient_match >= 75 and scored.taste >= 75 then 'Avete quasi tutti gli ingredienti e incontra i gusti selezionati.'
      when scored.ingredient_match >= 75 then 'Avete già quasi tutti gli ingredienti necessari.'
      when scored.taste >= 75 then 'È tra le ricette più apprezzate dalle persone selezionate.'
      when scored.variety >= 80 then 'Aggiunge varietà rispetto ai pasti delle ultime settimane.'
      else 'È una buona combinazione tra ingredienti, gusti e varietà.'
    end
  from scored
  order by scored.total desc, scored.ingredient_match desc, scored.title
  limit greatest(1, least(coalesce(p_limit, 3), 10));
end;
$$;

revoke all on function public.recommend_recipes(uuid, text[], uuid[], integer) from public;
grant execute on function public.recommend_recipes(uuid, text[], uuid[], integer) to authenticated;
