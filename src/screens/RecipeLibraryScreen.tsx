import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Card, Chip, Icon, Searchbar, Snackbar, Text } from "react-native-paper";
import { Screen } from "../components/Screen";
import { useTavola } from "../context/TavolaContext";
import { getErrorMessage } from "../lib/errors";
import { supabase } from "../lib/supabase";
import { palette } from "../theme/theme";
import { RecipeDetailScreen } from "./RecipeDetailScreen";

type LibraryRecipe = {
  id: string; title: string; description: string; source: "catalog" | "custom";
  parentRecipeId: string | null;
  servings: number; prepMinutes: number; cookMinutes: number; difficulty: string;
  mainProtein: string | null; tags: string[]; ingredientNames: string[]; imageKey: string | null; rating: number; votes: number;
};

const images: Record<string, ReturnType<typeof require>> = {
  "frittata-zucchine": require("../../assets/meals/frittata-zucchine.png"),
  "pasta-pesto": require("../../assets/meals/pasta-pesto.png"),
  "polpette-ceci": require("../../assets/meals/polpette-ceci.png"),
};

export function RecipeLibraryScreen({ onClose }: { onClose: () => void }) {
  const { personalizeRecipe } = useTavola();
  const [recipes, setRecipes] = useState<LibraryRecipe[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "catalog" | "custom">("all");
  const [loading, setLoading] = useState(true);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("recipes").select("id, parent_recipe_id, title, description, source, servings, prep_minutes, cook_minutes, difficulty, main_protein, tags, image_key, recipe_ratings(rating), recipe_ingredients(ingredients(display_name))").order("title");
      if (error) throw error;
      setRecipes((data ?? []).map((recipe) => {
        const ratings = (recipe.recipe_ratings ?? []).map((item) => item.rating);
        return {
          id: recipe.id, parentRecipeId: recipe.parent_recipe_id, title: recipe.title, description: recipe.description ?? "", source: recipe.source,
          servings: recipe.servings, prepMinutes: recipe.prep_minutes ?? 0, cookMinutes: recipe.cook_minutes ?? 0,
          difficulty: recipe.difficulty ?? "easy", mainProtein: recipe.main_protein, tags: recipe.tags ?? [],
          ingredientNames: (recipe.recipe_ingredients ?? []).flatMap((item) => {
            const ingredient = Array.isArray(item.ingredients) ? item.ingredients[0] : item.ingredients;
            return ingredient?.display_name ? [ingredient.display_name] : [];
          }),
          imageKey: recipe.image_key, rating: ratings.length ? Math.round(ratings.reduce((sum, value) => sum + value, 0) / ratings.length) : 0,
          votes: ratings.length,
        };
      }));
    } catch (error) { setMessage(getErrorMessage(error, "Impossibile caricare le ricette.")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRecipes(); }, [loadRecipes]);

  const visibleRecipes = useMemo(() => {
    const overriddenCatalogIds = new Set(recipes.flatMap((recipe) => recipe.parentRecipeId ? [recipe.parentRecipeId] : []));
    return recipes.filter((recipe) => {
    if (recipe.source === "catalog" && overriddenCatalogIds.has(recipe.id)) return false;
    const matchesFilter = filter === "all" || recipe.source === filter;
    const text = `${recipe.title} ${recipe.description} ${recipe.tags.join(" ")} ${recipe.ingredientNames.join(" ")}`.toLocaleLowerCase("it-IT");
    return matchesFilter && text.includes(query.trim().toLocaleLowerCase("it-IT"));
    });
  }, [filter, query, recipes]);

  const copyRecipe = async (recipe: LibraryRecipe) => {
    setCopyingId(recipe.id);
    try { await personalizeRecipe(recipe.id); setMessage(`${recipe.title} aggiunta alle ricette di famiglia`); }
    catch (error) { setMessage(getErrorMessage(error, "Non è stato possibile copiare la ricetta.")); }
    finally { setCopyingId(null); }
  };

  if (selectedRecipeId) return <RecipeDetailScreen recipeId={selectedRecipeId} onClose={() => setSelectedRecipeId(null)} onChanged={loadRecipes} />;

  return (
    <Screen>
      <Button icon="arrow-left" onPress={onClose} textColor={palette.terracotta} style={styles.back}>Torna alle idee</Button>
      <Text variant="headlineMedium" style={styles.title}>Tutte le ricette</Text>
      <Text style={styles.subtitle}>Cerca nel catalogo e nella raccolta privata della famiglia.</Text>
      <Searchbar placeholder="Cerca titolo o ingrediente" value={query} onChangeText={setQuery} style={styles.search} inputStyle={styles.searchInput} />
      <View style={styles.filters}><Chip selected={filter === "all"} onPress={() => setFilter("all")}>Tutte</Chip><Chip selected={filter === "catalog"} onPress={() => setFilter("catalog")}>Catalogo</Chip><Chip selected={filter === "custom"} onPress={() => setFilter("custom")}>Di famiglia</Chip></View>
      <View style={styles.counter}><Text style={styles.counterText}>{visibleRecipes.length} RICETTE</Text></View>
      {loading ? <ActivityIndicator style={styles.loader} color={palette.terracotta} /> : visibleRecipes.map((recipe) => <Card key={recipe.id} mode="outlined" style={styles.card} onPress={() => setSelectedRecipeId(recipe.id)}>
        {recipe.imageKey && images[recipe.imageKey] ? <Image source={images[recipe.imageKey]} style={styles.image} resizeMode="cover" /> : <View style={styles.placeholder}><Icon source="chef-hat" size={34} color={palette.terracotta} /></View>}
        <Card.Content style={styles.body}><View style={styles.heading}><View style={styles.copy}><Text variant="titleMedium" style={styles.recipeTitle}>{recipe.title}</Text><Text style={styles.meta}>{recipe.prepMinutes + recipe.cookMinutes} min · {recipe.servings} porzioni · {recipe.source === "catalog" ? "Catalogo" : "Famiglia"}</Text></View>{recipe.rating ? <View style={styles.rating}><Icon source="star" size={15} color={palette.terracotta} /><Text style={styles.ratingText}>{recipe.rating}</Text></View> : null}</View>{recipe.description ? <Text numberOfLines={2} style={styles.description}>{recipe.description}</Text> : null}<View style={styles.footer}><View style={styles.tagRow}>{recipe.tags.slice(0, 2).map((tag) => <Chip key={tag} compact style={styles.tag}>{tag}</Chip>)}</View>{recipe.source === "catalog" ? <Button compact icon="content-copy" loading={copyingId === recipe.id} disabled={Boolean(copyingId)} onPress={() => copyRecipe(recipe)}>Personalizza</Button> : null}</View></Card.Content>
      </Card>)}
      {!loading && visibleRecipes.length === 0 ? <Card mode="contained" style={styles.empty}><Card.Content><Text style={styles.recipeTitle}>Nessuna ricetta trovata</Text><Text style={styles.description}>Prova un altro termine o cambia filtro.</Text></Card.Content></Card> : null}
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")} duration={3000}>{message}</Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: "flex-start", marginLeft: -10, marginBottom: 8 }, title: { color: palette.forest, fontWeight: "800" }, subtitle: { color: palette.muted, marginTop: 6, marginBottom: 18 }, search: { backgroundColor: palette.cream, borderRadius: 5, borderWidth: 1, borderColor: palette.line }, searchInput: { minHeight: 48 }, filters: { flexDirection: "row", gap: 8, marginVertical: 14 }, counter: { borderBottomWidth: 1, borderBottomColor: palette.line, paddingBottom: 10, marginBottom: 12 }, counterText: { color: palette.terracotta, fontSize: 10, fontWeight: "900", letterSpacing: 1 }, loader: { marginVertical: 50 }, card: { borderRadius: 6, borderColor: palette.line, overflow: "hidden", marginBottom: 13 }, image: { width: "100%", height: 145 }, placeholder: { height: 100, backgroundColor: palette.sage, alignItems: "center", justifyContent: "center" }, body: { paddingTop: 13 }, heading: { flexDirection: "row", alignItems: "flex-start" }, copy: { flex: 1 }, recipeTitle: { color: palette.forest, fontWeight: "800" }, meta: { color: palette.muted, fontSize: 12, marginTop: 3 }, rating: { flexDirection: "row", alignItems: "center", backgroundColor: palette.sage, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 3 }, ratingText: { color: palette.forest, fontSize: 12, fontWeight: "800", marginLeft: 3 }, description: { color: palette.muted, lineHeight: 19, marginTop: 9 }, footer: { flexDirection: "row", alignItems: "center", marginTop: 12 }, tagRow: { flex: 1, flexDirection: "row", gap: 6 }, tag: { borderRadius: 3, backgroundColor: palette.cream }, empty: { backgroundColor: palette.sage, borderRadius: 6 },
});
