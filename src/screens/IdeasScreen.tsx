import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Card, Chip, Dialog, Icon, IconButton, Portal, Snackbar, Text, TextInput } from "react-native-paper";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { useTavola } from "../context/TavolaContext";
import { palette } from "../theme/theme";
import { RecipeEditorScreen } from "./RecipeEditorScreen";
import { RecipeLibraryScreen } from "./RecipeLibraryScreen";

const recipeImages = {
  1: require("../../assets/meals/frittata-zucchine.png"),
  2: require("../../assets/meals/pasta-pesto.png"),
  3: require("../../assets/meals/polpette-ceci.png"),
} as const;
const catalogImages: Record<string, ReturnType<typeof require>> = {
  "frittata-zucchine": require("../../assets/meals/frittata-zucchine.png"),
  "pasta-pesto": require("../../assets/meals/pasta-pesto.png"),
  "polpette-ceci": require("../../assets/meals/polpette-ceci.png"),
};

export function IdeasScreen() {
  const { ingredients, recipes, family, customRecipes, customRecipesLoading, suggestedRecipes, suggestionsLoading, addIngredient, removeIngredient, voteRecipe, rateCustomRecipe, findRecipeSuggestions, personalizeRecipe } = useTavola();
  const [draft, setDraft] = useState("");
  const [generated, setGenerated] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{ recipeId: string; rating: number } | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const submitIngredient = () => { addIngredient(draft); setDraft(""); };
  useEffect(() => { if (family.length && !selectedMembers.length) setSelectedMembers(family.map((person) => person.id)); }, [family, selectedMembers.length]);
  const toggleMember = (id: string) => setSelectedMembers((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  const generate = async () => {
    try { await findRecipeSuggestions(selectedMembers); setGenerated(true); }
    catch (error) { setMessage(error && typeof error === "object" && "message" in error ? String(error.message) : "Non è stato possibile creare i suggerimenti."); }
  };
  const personalize = async (recipeId: string, title: string) => {
    try { await personalizeRecipe(recipeId); setMessage(`${title} copiata nelle ricette di famiglia`); }
    catch (error) { setMessage(error && typeof error === "object" && "message" in error ? String(error.message) : "Non è stato possibile personalizzare la ricetta."); }
  };

  if (editing) return <RecipeEditorScreen onClose={() => setEditing(false)} onSaved={(title) => { setEditing(false); setMessage(`${title} salvata nella raccolta di famiglia`); }} />;
  if (showLibrary) return <RecipeLibraryScreen onClose={() => setShowLibrary(false)} />;

  return (
    <Screen>
      <Text variant="bodyMedium" style={styles.helper}>Scrivi cosa hai in casa. Ti proponiamo 3 ricette adatte alla famiglia.</Text>
      <View style={styles.topActions}><Button mode="contained" icon="plus" buttonColor={palette.terracotta} contentStyle={styles.createButton} style={styles.actionButton} onPress={() => setEditing(true)}>Crea</Button><Button mode="outlined" icon="book-open-variant" contentStyle={styles.createButton} style={styles.actionButton} onPress={() => setShowLibrary(true)}>Tutte le ricette</Button></View>
      <Card mode="outlined" style={styles.inputCard}><Card.Content>
        <View style={styles.inputRow}><TextInput mode="outlined" label="Aggiungi un ingrediente" value={draft} onChangeText={setDraft} onSubmitEditing={submitIngredient} style={styles.input} outlineStyle={styles.inputOutline} /><IconButton icon="plus" mode="contained" containerColor={palette.terracotta} iconColor="#FFF" size={24} onPress={submitIngredient} style={styles.add} /></View>
        <View style={styles.chips}>{ingredients.map((item) => <Chip key={item} onClose={() => removeIngredient(item)} style={styles.chip}>{item}</Chip>)}</View>
        <Text style={styles.forWho}>PER CHI CUCINIAMO?</Text>
        <View style={styles.chips}>{family.map((person) => <Chip key={person.id} selected={selectedMembers.includes(person.id)} showSelectedCheck onPress={() => toggleMember(person.id)} style={styles.memberChip}>{person.name}</Chip>)}</View>
        <Button mode="contained" icon="creation" disabled={!ingredients.length || !selectedMembers.length || suggestionsLoading} loading={suggestionsLoading} contentStyle={styles.button} onPress={generate}>Trova 3 ricette</Button>
      </Card.Content></Card>
      <SectionHeader title="Le ricette di famiglia" meta={customRecipes.length ? `${customRecipes.length} SALVATE` : undefined} />
      {customRecipesLoading ? <ActivityIndicator style={styles.loader} color={palette.terracotta} /> : null}
      {!customRecipesLoading && customRecipes.length === 0 ? <Card mode="contained" style={styles.empty}><Card.Content style={styles.emptyBody}><Icon source="notebook-edit-outline" size={28} color={palette.terracotta} /><View style={styles.emptyCopy}><Text variant="titleSmall" style={styles.recipeTitle}>La raccolta è ancora vuota</Text><Text variant="bodySmall" style={styles.recipeMeta}>Aggiungi una ricetta che preparate spesso.</Text></View></Card.Content></Card> : null}
      {customRecipes.map((recipe) => <Card key={recipe.id} mode="outlined" style={styles.customCard}><Card.Content><View style={styles.customHeading}><View style={styles.customIcon}><Icon source="chef-hat" size={24} color="#FFFFFF" /></View><View style={styles.emptyCopy}><Text variant="titleMedium" style={styles.recipeTitle}>{recipe.title}</Text><Text variant="bodySmall" style={styles.recipeMeta}>{recipe.prepMinutes + recipe.cookMinutes} min · {recipe.servings} porzioni · Ricetta di famiglia</Text></View></View>{recipe.description ? <Text style={styles.customDescription}>{recipe.description}</Text> : null}<View style={styles.ratingRow}><View style={styles.stars}>{[1, 2, 3, 4, 5].map((star) => <IconButton key={star} icon={star <= recipe.rating ? "star" : "star-outline"} iconColor={palette.terracotta} size={20} style={styles.star} onPress={() => setRatingTarget({ recipeId: recipe.id, rating: star })} />)}</View><Text variant="labelSmall" style={styles.votes}>{recipe.votes ? `${recipe.votes} voti` : "Vota"}</Text></View></Card.Content></Card>)}
      <SectionHeader title={generated ? "Scelte per voi" : "Le più amate"} meta={generated ? `${suggestedRecipes.length} RISULTATI` : "3 RISULTATI"} />
      {generated && suggestedRecipes.length === 0 ? <Card mode="contained" style={styles.empty}><Card.Content><Text style={styles.recipeTitle}>Nessuna ricetta compatibile</Text><Text style={styles.recipeMeta}>Prova ad aggiungere altri ingredienti o a modificare le persone selezionate.</Text></Card.Content></Card> : null}
      {generated ? suggestedRecipes.map((recipe) => (
        <Card key={recipe.id} mode="outlined" style={styles.recipeCard}>
          <View style={styles.visual}><Image source={catalogImages[recipe.imageKey ?? ""] ?? require("../../assets/meals/pollo-verdure.png")} style={styles.recipeImage} resizeMode="cover" /><Chip compact style={styles.match} textStyle={styles.matchText}>{Math.round(recipe.totalScore)}% affinità</Chip></View>
          <Card.Content style={styles.recipeBody}><Text variant="titleMedium" style={styles.recipeTitle}>{recipe.title}</Text><Text variant="bodySmall" style={styles.recipeMeta}>{recipe.prepMinutes + recipe.cookMinutes} min · Ingredienti {Math.round(recipe.matchScore)}% · Gusti {Math.round(recipe.tasteScore)}%</Text><Text style={styles.reason}>{recipe.reason}</Text>
            <View style={styles.ratingRow}><View style={styles.stars}>{[1, 2, 3, 4, 5].map((star) => <IconButton key={star} icon={star <= recipe.rating ? "star" : "star-outline"} iconColor={palette.terracotta} size={20} style={styles.star} onPress={() => setRatingTarget({ recipeId: recipe.id, rating: star })} />)}</View><Text variant="labelSmall" style={styles.votes}>{recipe.votes ? `${recipe.votes} voti` : "Vota"}</Text><IconButton icon="content-copy" mode="contained-tonal" size={20} onPress={() => personalize(recipe.id, recipe.title)} /><IconButton icon="calendar-plus" mode="contained-tonal" size={20} onPress={() => setMessage(`${recipe.title}: scegli il giorno nella sezione Settimana`)} /></View>
          </Card.Content>
        </Card>
      )) : recipes.map((recipe) => (
        <Card key={recipe.id} mode="outlined" style={styles.recipeCard}>
          <View style={styles.visual}><Image source={recipeImages[recipe.id as keyof typeof recipeImages]} style={styles.recipeImage} resizeMode="cover" /><Chip compact style={styles.match} textStyle={styles.matchText}>{recipe.match}% match</Chip></View>
          <Card.Content style={styles.recipeBody}><Text variant="titleMedium" style={styles.recipeTitle}>{recipe.title}</Text><Text variant="bodySmall" style={styles.recipeMeta}>{recipe.time}  ·  {recipe.tags.join(" · ")}</Text>
            <View style={styles.ratingRow}><View style={styles.stars}>{[1, 2, 3, 4, 5].map((star) => <IconButton key={star} icon={star <= recipe.rating ? "star" : "star-outline"} iconColor={palette.terracotta} size={20} style={styles.star} onPress={() => voteRecipe(recipe.id, star)} />)}</View><Text variant="labelSmall" style={styles.votes}>{recipe.votes} voti</Text><IconButton icon="plus" mode="contained-tonal" size={20} onPress={() => setMessage(`${recipe.title} aggiunta al menu`)} /></View>
          </Card.Content>
        </Card>
      ))}
      <Portal><Dialog visible={Boolean(ratingTarget)} onDismiss={() => setRatingTarget(null)} style={styles.ratingDialog}><Dialog.Title>Chi sta votando?</Dialog.Title><Dialog.Content><Text style={styles.dialogText}>Il voto sarà associato al profilo personale.</Text>{family.map((person) => <Button key={person.id} mode="outlined" style={styles.memberButton} onPress={async () => { if (!ratingTarget) return; try { await rateCustomRecipe(ratingTarget.recipeId, person.id, ratingTarget.rating); setMessage(`Voto di ${person.name} salvato`); setRatingTarget(null); } catch { setMessage("Non è stato possibile salvare il voto"); } }}>{person.name}</Button>)}</Dialog.Content></Dialog></Portal>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")} duration={2200}>{message}</Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  helper: { color: palette.muted, lineHeight: 22, marginBottom: 18 }, topActions: { flexDirection: "row", gap: 9, marginBottom: 13 }, actionButton: { flex: 1, borderRadius: 4 }, createButton: { height: 50 }, inputCard: { borderRadius: 6, borderColor: palette.line, backgroundColor: palette.paper, marginBottom: 24 }, inputRow: { flexDirection: "row", alignItems: "center", gap: 8 }, input: { flex: 1, backgroundColor: palette.paper }, inputOutline: { borderRadius: 4 }, add: { width: 50, height: 50, borderRadius: 4 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 14 }, chip: { backgroundColor: "#E5F5F5", borderRadius: 4 }, memberChip: { borderRadius: 4 }, forWho: { color: palette.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1, marginTop: 2 }, button: { height: 50 }, loader: { marginVertical: 24 }, empty: { backgroundColor: palette.sage, borderRadius: 6, marginBottom: 24 }, emptyBody: { flexDirection: "row", alignItems: "center" }, emptyCopy: { flex: 1, marginLeft: 12 }, customCard: { borderRadius: 6, borderColor: palette.line, borderLeftWidth: 4, borderLeftColor: palette.terracotta, marginBottom: 12 }, customHeading: { flexDirection: "row", alignItems: "center" }, customIcon: { width: 43, height: 43, borderRadius: 5, backgroundColor: palette.terracotta, alignItems: "center", justifyContent: "center" }, customDescription: { color: palette.muted, lineHeight: 20, marginTop: 12 }, ratingDialog: { backgroundColor: palette.cream, borderRadius: 8 }, dialogText: { color: palette.muted, marginBottom: 14 }, memberButton: { marginBottom: 8, borderColor: palette.line }, reason: { color: palette.forest, fontSize: 12, lineHeight: 18, marginTop: 10, padding: 10, backgroundColor: palette.sage, borderRadius: 4 },
  recipeCard: { borderRadius: 6, borderColor: palette.line, overflow: "hidden", backgroundColor: palette.paper, marginBottom: 15 }, visual: { height: 165 }, recipeImage: { width: "100%", height: "100%" }, match: { position: "absolute", right: 11, top: 11, backgroundColor: palette.forest, borderRadius: 3 }, matchText: { color: "#FFF", fontWeight: "800", fontSize: 10 }, recipeBody: { paddingTop: 14 }, recipeTitle: { color: palette.forest, fontWeight: "800" }, recipeMeta: { color: palette.muted, marginTop: 4 }, ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 8 }, stars: { flexDirection: "row" }, star: { width: 25, height: 32, margin: 0 }, votes: { flex: 1, color: palette.muted, marginLeft: 7 },
});
