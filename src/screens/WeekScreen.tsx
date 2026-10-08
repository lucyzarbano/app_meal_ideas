import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Card, Dialog, Icon, IconButton, Portal, Snackbar, Text, TouchableRipple } from "react-native-paper";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { useTavola } from "../context/TavolaContext";
import { supabase } from "../lib/supabase";
import { palette } from "../theme/theme";

type PlannedMeal = { itemId: string; recipeId: string; title: string; mainProtein: string | null };

const weekdays = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"];
const months = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

function addDays(date: Date, days: number) { const result = new Date(date); result.setDate(result.getDate() + days); return result; }
function isoDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function mondayOf(date: Date) { const result = new Date(date.getFullYear(), date.getMonth(), date.getDate()); const day = result.getDay(); result.setDate(result.getDate() - (day === 0 ? 6 : day - 1)); return result; }
function weekLabel(start: Date) {
  const end = addDays(start, 6);
  if (start.getMonth() === end.getMonth()) return `${start.getDate()} – ${end.getDate()} ${months[end.getMonth()]}`;
  return `${start.getDate()} ${months[start.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]}`;
}
function proteinIcon(value: string | null) {
  if (value === "fish") return "fish";
  if (value === "meat") return "food-drumstick";
  if (value === "eggs") return "egg-outline";
  if (value === "legumes") return "sprout-outline";
  return "silverware-fork-knife";
}

export function WeekScreen({ onOpenIdeas }: { onOpenIdeas: () => void }) {
  const { family: authFamily, user } = useAuth();
  const { customRecipes, customRecipesLoading } = useTavola();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [menuId, setMenuId] = useState<string | null>(null);
  const [meals, setMeals] = useState<Record<string, PlannedMeal>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const days = useMemo(() => weekdays.map((short, index) => ({ short, date: addDays(weekStart, index), iso: isoDate(addDays(weekStart, index)) })), [weekStart]);

  const loadMenu = useCallback(async () => {
    if (!authFamily?.id) return;
    setLoading(true);
    setMeals({});
    try {
      const { data: menu, error: menuError } = await supabase.from("weekly_menus").select("id").eq("family_id", authFamily.id).eq("week_start", isoDate(weekStart)).maybeSingle();
      if (menuError) throw menuError;
      if (!menu) { setMenuId(null); return; }
      setMenuId(menu.id);
      const { data: items, error: itemsError } = await supabase.from("menu_items").select("id, meal_date, primary_recipe_id, recipes(title, main_protein)").eq("weekly_menu_id", menu.id).eq("meal_type", "dinner");
      if (itemsError) throw itemsError;
      const next: Record<string, PlannedMeal> = {};
      for (const item of items ?? []) {
        const recipe = Array.isArray(item.recipes) ? item.recipes[0] : item.recipes;
        if (item.primary_recipe_id && recipe) next[item.meal_date] = { itemId: item.id, recipeId: item.primary_recipe_id, title: recipe.title, mainProtein: recipe.main_protein };
      }
      setMeals(next);
    } catch (error) {
      const text = error && typeof error === "object" && "message" in error ? String(error.message) : "Impossibile caricare il menu.";
      setMessage(text);
    } finally { setLoading(false); }
  }, [authFamily?.id, weekStart]);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  const ensureMenu = async () => {
    if (menuId) return menuId;
    if (!authFamily?.id || !user?.id) throw new Error("Famiglia non disponibile.");
    const { data, error } = await supabase.from("weekly_menus").insert({ family_id: authFamily.id, week_start: isoDate(weekStart), created_by: user.id }).select("id").single();
    if (error) throw error;
    setMenuId(data.id);
    return data.id;
  };

  const assignRecipe = async (recipeId: string, title: string) => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const currentMenuId = await ensureMenu();
      const { error } = await supabase.from("menu_items").upsert({ weekly_menu_id: currentMenuId, meal_date: selectedDate, meal_type: "dinner", primary_recipe_id: recipeId }, { onConflict: "weekly_menu_id,meal_date,meal_type" });
      if (error) throw error;
      setSelectedDate(null);
      setMessage(`${title} aggiunta al menu`);
      await loadMenu();
    } catch (error) {
      setMessage(error && typeof error === "object" && "message" in error ? String(error.message) : "Non è stato possibile aggiornare il menu.");
    } finally { setSaving(false); }
  };

  const removeMeal = async () => {
    if (!selectedDate || !meals[selectedDate]) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("menu_items").delete().eq("id", meals[selectedDate].itemId);
      if (error) throw error;
      setSelectedDate(null);
      await loadMenu();
    } catch (error) {
      setMessage(error && typeof error === "object" && "message" in error ? String(error.message) : "Non è stato possibile rimuovere il pasto.");
    } finally { setSaving(false); }
  };

  return (
    <Screen>
      <Card mode="outlined" style={styles.switcher}><Card.Content style={styles.switcherContent}><IconButton icon="chevron-left" mode="contained-tonal" size={20} onPress={() => setWeekStart((date) => addDays(date, -7))} /><Text variant="titleMedium" style={styles.week}>{weekLabel(weekStart)}</Text><IconButton icon="chevron-right" mode="contained-tonal" size={20} onPress={() => setWeekStart((date) => addDays(date, 7))} /></Card.Content></Card>
      <Text variant="bodyMedium" style={styles.helper}>Pianifica le cene e salvale per tutta la famiglia.</Text>
      {loading ? <ActivityIndicator style={styles.loader} color={palette.terracotta} /> : days.map((item) => {
        const meal = meals[item.iso];
        const today = item.iso === isoDate(new Date());
        return <TouchableRipple key={item.iso} style={[styles.dayCard, today && styles.active]} borderless onPress={() => setSelectedDate(item.iso)}>
          <View style={styles.dayRow}><View style={styles.date}><Text style={styles.short}>{item.short}</Text><Text style={styles.number}>{item.date.getDate()}</Text></View><View style={[styles.thumb, meal ? styles.thumbFilled : styles.thumbEmpty]}><Icon source={meal ? proteinIcon(meal.mainProtein) : "plus"} color={meal ? "#FFFFFF" : palette.terracotta} size={24} /></View><View style={styles.flex}><Text variant="titleSmall" style={[styles.meal, !meal && styles.muted]}>{meal?.title ?? "Da scegliere"}</Text><Text variant="bodySmall" style={styles.meta}>{meal ? "Cena · Per tutta la famiglia" : "Tocca per aggiungere"}</Text></View><Icon source="chevron-right" color="#9B9A93" size={20} /></View>
        </TouchableRipple>;
      })}
      <Button mode="outlined" icon="creation" contentStyle={styles.button} onPress={onOpenIdeas}>Crea o cerca una ricetta</Button>

      <Portal><Dialog visible={Boolean(selectedDate)} onDismiss={() => !saving && setSelectedDate(null)} style={styles.dialog}><Dialog.Title>Scegli la cena</Dialog.Title><Dialog.Content><Text style={styles.dialogText}>{selectedDate ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }) : ""}</Text>{customRecipesLoading ? <ActivityIndicator color={palette.terracotta} /> : customRecipes.map((recipe) => <TouchableRipple key={recipe.id} style={styles.recipeChoice} onPress={() => assignRecipe(recipe.id, recipe.title)} disabled={saving}><View style={styles.recipeChoiceRow}><View style={styles.choiceIcon}><Icon source={proteinIcon(recipe.mainProtein)} size={21} color={palette.terracotta} /></View><View style={styles.flex}><Text style={styles.choiceTitle}>{recipe.title}</Text><Text style={styles.choiceMeta}>{recipe.prepMinutes + recipe.cookMinutes} min · {recipe.servings} porzioni</Text></View><Icon source="plus" size={20} color={palette.terracotta} /></View></TouchableRipple>)}{!customRecipesLoading && customRecipes.length === 0 ? <View style={styles.empty}><Text style={styles.dialogText}>Prima crea una ricetta nella sezione Idee.</Text><Button mode="contained" onPress={() => { setSelectedDate(null); onOpenIdeas(); }}>Vai alle ricette</Button></View> : null}{selectedDate && meals[selectedDate] ? <Button icon="delete-outline" textColor="#B42318" onPress={removeMeal} disabled={saving} style={styles.remove}>Rimuovi questa cena</Button> : null}</Dialog.Content></Dialog></Portal>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")} duration={3000}>{message}</Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switcher: { borderRadius: 6, borderColor: palette.line, backgroundColor: palette.paper }, switcherContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }, week: { color: palette.forest, fontWeight: "800" }, helper: { color: palette.muted, marginVertical: 16 }, loader: { marginVertical: 50 },
  dayCard: { backgroundColor: palette.paper, borderRadius: 5, borderWidth: 1, borderColor: palette.line, marginBottom: 10, overflow: "hidden" }, active: { borderColor: palette.terracotta, backgroundColor: "#F4FBFB", borderLeftWidth: 4 }, dayRow: { minHeight: 74, flexDirection: "row", alignItems: "center", padding: 11 }, date: { width: 42, alignItems: "center", marginRight: 7 }, short: { color: palette.terracotta, fontSize: 9, fontWeight: "800", letterSpacing: 1 }, number: { color: palette.forest, fontSize: 22, fontWeight: "800" },
  thumb: { width: 48, height: 48, borderRadius: 5, alignItems: "center", justifyContent: "center", marginRight: 12 }, thumbFilled: { backgroundColor: palette.terracotta }, thumbEmpty: { backgroundColor: palette.sage, borderWidth: 1, borderColor: "#BFE8E8" }, flex: { flex: 1 }, meal: { color: palette.ink, fontWeight: "800" }, muted: { color: palette.muted }, meta: { color: palette.muted, marginTop: 3 }, button: { height: 51 },
  dialog: { backgroundColor: palette.cream, borderRadius: 8, maxHeight: "80%" }, dialogText: { color: palette.muted, marginBottom: 14 }, recipeChoice: { backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, borderRadius: 5, marginBottom: 9 }, recipeChoiceRow: { flexDirection: "row", alignItems: "center", padding: 11 }, choiceIcon: { width: 40, height: 40, borderRadius: 4, backgroundColor: palette.sage, alignItems: "center", justifyContent: "center", marginRight: 10 }, choiceTitle: { color: palette.forest, fontWeight: "800" }, choiceMeta: { color: palette.muted, fontSize: 12, marginTop: 2 }, empty: { paddingVertical: 8 }, remove: { marginTop: 8 },
});
