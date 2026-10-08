import { useCallback, useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Card, Chip, Dialog, Divider, Icon, Portal, Snackbar, Text } from "react-native-paper";
import { Screen } from "../components/Screen";
import { useTavola } from "../context/TavolaContext";
import { getErrorMessage } from "../lib/errors";
import { supabase } from "../lib/supabase";
import { palette } from "../theme/theme";
import { RecipeDetail } from "../types";
import { RecipeEditorScreen } from "./RecipeEditorScreen";

const images: Record<string, ReturnType<typeof require>> = {
  "frittata-zucchine": require("../../assets/meals/frittata-zucchine.png"),
  "pasta-pesto": require("../../assets/meals/pasta-pesto.png"),
  "polpette-ceci": require("../../assets/meals/polpette-ceci.png"),
};

export function RecipeDetailScreen({ recipeId, onClose, onChanged }: { recipeId: string; onClose: () => void; onChanged: () => void }) {
  const { deleteCustomRecipe, personalizeRecipe } = useTavola();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadRecipe = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("recipes").select("id, title, description, source, servings, prep_minutes, cook_minutes, difficulty, main_protein, tags, image_key, recipe_ingredients(quantity, unit, preparation, is_optional, sort_order, ingredients(display_name)), recipe_steps(step_number, instruction)").eq("id", recipeId).single();
      if (error) throw error;
      const ingredients = (data.recipe_ingredients ?? []).sort((a, b) => a.sort_order - b.sort_order).flatMap((item) => {
        const ingredient = Array.isArray(item.ingredients) ? item.ingredients[0] : item.ingredients;
        return ingredient ? [{ name: ingredient.display_name, quantity: item.quantity === null ? "" : String(item.quantity), unit: item.unit ?? "", preparation: item.preparation ?? undefined, optional: item.is_optional }] : [];
      });
      const steps = (data.recipe_steps ?? []).sort((a, b) => a.step_number - b.step_number).map((item) => ({ instruction: item.instruction }));
      setRecipe({ id: data.id, title: data.title, description: data.description ?? "", source: data.source, servings: data.servings, prepMinutes: data.prep_minutes ?? 0, cookMinutes: data.cook_minutes ?? 0, difficulty: data.difficulty ?? "easy", mainProtein: data.main_protein ?? "mixed", tags: data.tags ?? [], imageKey: data.image_key, ingredients, steps });
    } catch (error) { setMessage(getErrorMessage(error, "Impossibile caricare la ricetta.")); }
    finally { setLoading(false); }
  }, [recipeId]);

  useEffect(() => { loadRecipe(); }, [loadRecipe]);

  if (editing && recipe) return <RecipeEditorScreen recipe={recipe} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); loadRecipe(); onChanged(); setMessage("Modifiche salvate"); }} />;

  const remove = async () => {
    if (!recipe) return;
    setBusy(true);
    try { await deleteCustomRecipe(recipe.id); setConfirmDelete(false); onChanged(); onClose(); }
    catch (error) { setConfirmDelete(false); setMessage(getErrorMessage(error, "Non è stato possibile eliminare la ricetta.")); }
    finally { setBusy(false); }
  };

  const copy = async () => {
    if (!recipe) return;
    setBusy(true);
    try { await personalizeRecipe(recipe.id); onChanged(); setMessage("Copia aggiunta alle ricette di famiglia"); }
    catch (error) { setMessage(getErrorMessage(error)); }
    finally { setBusy(false); }
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={palette.terracotta} /></View>;
  if (!recipe) return <Screen><Button icon="arrow-left" onPress={onClose}>Indietro</Button><Text>Ricetta non disponibile.</Text></Screen>;

  const image = recipe.imageKey ? images[recipe.imageKey] : undefined;
  return (
    <Screen>
      <Button icon="arrow-left" onPress={onClose} textColor={palette.terracotta} style={styles.back}>Tutte le ricette</Button>
      {image ? <Image source={image} style={styles.image} resizeMode="cover" /> : <View style={styles.placeholder}><Icon source="chef-hat" size={42} color={palette.terracotta} /></View>}
      <View style={styles.sourceRow}><Text style={styles.source}>{recipe.source === "catalog" ? "RICETTA DEL CATALOGO" : "RICETTA DI FAMIGLIA"}</Text></View>
      <Text variant="headlineMedium" style={styles.title}>{recipe.title}</Text>
      {recipe.description ? <Text style={styles.description}>{recipe.description}</Text> : null}
      <View style={styles.facts}><View style={styles.fact}><Icon source="clock-outline" size={20} color={palette.terracotta} /><Text style={styles.factText}>{recipe.prepMinutes + recipe.cookMinutes} min</Text></View><View style={styles.fact}><Icon source="account-group-outline" size={20} color={palette.terracotta} /><Text style={styles.factText}>{recipe.servings} porzioni</Text></View><View style={styles.fact}><Icon source="signal" size={20} color={palette.terracotta} /><Text style={styles.factText}>{recipe.difficulty === "easy" ? "Facile" : recipe.difficulty === "medium" ? "Media" : "Esperta"}</Text></View></View>
      {recipe.tags.length ? <View style={styles.tags}>{recipe.tags.map((tag) => <Chip key={tag} compact style={styles.tag}>{tag}</Chip>)}</View> : null}
      <Divider style={styles.divider} />
      <Text variant="titleLarge" style={styles.sectionTitle}>Ingredienti</Text>
      {recipe.ingredients.map((ingredient, index) => <View key={`${ingredient.name}-${index}`} style={styles.ingredient}><View style={styles.dot} /><Text style={styles.ingredientName}>{ingredient.name}{ingredient.preparation ? `, ${ingredient.preparation}` : ""}</Text><Text style={styles.amount}>{[ingredient.quantity, ingredient.unit].filter(Boolean).join(" ")}</Text></View>)}
      <Divider style={styles.divider} />
      <Text variant="titleLarge" style={styles.sectionTitle}>Procedimento</Text>
      {recipe.steps.map((step, index) => <View key={`step-${index}`} style={styles.step}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View><Text style={styles.stepText}>{step.instruction}</Text></View>)}
      <View style={styles.actions}>{recipe.source === "custom" ? <><Button mode="contained" icon="pencil-outline" onPress={() => setEditing(true)} style={styles.mainAction}>Modifica</Button><Button mode="outlined" icon="delete-outline" textColor="#B42318" onPress={() => setConfirmDelete(true)} style={styles.deleteAction}>Elimina</Button></> : <Button mode="contained" icon="content-copy" onPress={copy} loading={busy} disabled={busy} style={styles.mainAction}>Personalizza per la famiglia</Button>}</View>
      <Portal><Dialog visible={confirmDelete} onDismiss={() => !busy && setConfirmDelete(false)} style={styles.dialog}><Dialog.Title>Eliminare la ricetta?</Dialog.Title><Dialog.Content><Text>La ricetta e i suoi voti verranno rimossi. I menu che la utilizzano resteranno senza ricetta associata.</Text></Dialog.Content><Dialog.Actions><Button onPress={() => setConfirmDelete(false)} disabled={busy}>Annulla</Button><Button textColor="#B42318" onPress={remove} loading={busy}>Elimina</Button></Dialog.Actions></Dialog></Portal>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")} duration={3000}>{message}</Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" }, back: { alignSelf: "flex-start", marginLeft: -10, marginBottom: 9 }, image: { width: "100%", height: 220, borderRadius: 7 }, placeholder: { height: 150, borderRadius: 7, backgroundColor: palette.sage, alignItems: "center", justifyContent: "center" }, sourceRow: { marginTop: 18 }, source: { color: palette.terracotta, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 }, title: { color: palette.forest, fontWeight: "800", marginTop: 7 }, description: { color: palette.muted, lineHeight: 22, marginTop: 8 }, facts: { flexDirection: "row", gap: 8, marginTop: 16 }, fact: { flex: 1, backgroundColor: palette.cream, borderWidth: 1, borderColor: palette.line, padding: 10, borderRadius: 5, alignItems: "center" }, factText: { color: palette.forest, fontSize: 11, fontWeight: "800", marginTop: 5 }, tags: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 }, tag: { borderRadius: 3, backgroundColor: palette.sage }, divider: { marginVertical: 22 }, sectionTitle: { color: palette.forest, fontWeight: "800", marginBottom: 13 }, ingredient: { minHeight: 42, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: palette.line }, dot: { width: 7, height: 7, backgroundColor: palette.terracotta, marginRight: 10 }, ingredientName: { flex: 1, color: palette.ink }, amount: { color: palette.muted, fontWeight: "700" }, step: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 }, stepNumber: { width: 30, height: 30, borderRadius: 4, backgroundColor: palette.terracotta, alignItems: "center", justifyContent: "center", marginRight: 11 }, stepNumberText: { color: "#FFF", fontWeight: "900" }, stepText: { flex: 1, color: palette.ink, lineHeight: 21, paddingTop: 4 }, actions: { marginTop: 24, gap: 9 }, mainAction: { borderRadius: 4 }, deleteAction: { borderRadius: 4, borderColor: "#FDA29B" }, dialog: { backgroundColor: palette.cream, borderRadius: 8 },
});
