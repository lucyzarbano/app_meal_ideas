import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Divider, HelperText, IconButton, SegmentedButtons, Text, TextInput } from "react-native-paper";
import { Screen } from "../components/Screen";
import { useTavola } from "../context/TavolaContext";
import { palette } from "../theme/theme";
import { NewRecipeInput, RecipeDetail } from "../types";
import { getErrorMessage } from "../lib/errors";

type IngredientDraft = { name: string; quantity: string; unit: string };

export function RecipeEditorScreen({ onClose, onSaved, recipe }: { onClose: () => void; onSaved: (title: string) => void; recipe?: RecipeDetail }) {
  const { createCustomRecipe, updateCustomRecipe } = useTavola();
  const [title, setTitle] = useState(recipe?.title ?? "");
  const [description, setDescription] = useState(recipe?.description ?? "");
  const [servings, setServings] = useState(String(recipe?.servings ?? 4));
  const [prepMinutes, setPrepMinutes] = useState(String(recipe?.prepMinutes ?? 15));
  const [cookMinutes, setCookMinutes] = useState(String(recipe?.cookMinutes ?? 20));
  const [difficulty, setDifficulty] = useState<NewRecipeInput["difficulty"]>(recipe?.difficulty ?? "easy");
  const [mainProtein, setMainProtein] = useState(recipe?.mainProtein ?? "plant");
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(recipe?.ingredients.length ? recipe.ingredients.map((item) => ({ name: item.name, quantity: item.quantity, unit: item.unit })) : [{ name: "", quantity: "", unit: "g" }]);
  const [steps, setSteps] = useState(recipe?.steps.length ? recipe.steps.map((item) => item.instruction) : [""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const updateIngredient = (index: number, key: keyof IngredientDraft, value: string) => setIngredients((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const removeIngredient = (index: number) => setIngredients((items) => items.filter((_, itemIndex) => itemIndex !== index));
  const updateStep = (index: number, value: string) => setSteps((items) => items.map((item, itemIndex) => itemIndex === index ? value : item));

  const save = async () => {
    const cleanIngredients = ingredients.filter((item) => item.name.trim());
    const cleanSteps = steps.filter((item) => item.trim());
    if (!title.trim()) return setError("Inserisci il titolo della ricetta.");
    if (!cleanIngredients.length) return setError("Inserisci almeno un ingrediente.");
    if (!cleanSteps.length) return setError("Inserisci almeno un passaggio.");
    setBusy(true); setError("");
    try {
      const input: NewRecipeInput = {
        title: title.trim(), description: description.trim(), servings: Number(servings) || 4,
        prepMinutes: Number(prepMinutes) || 0, cookMinutes: Number(cookMinutes) || 0,
        difficulty, mainProtein, ingredients: cleanIngredients, steps: cleanSteps.map((instruction) => ({ instruction })),
      };
      if (recipe) await updateCustomRecipe(recipe.id, input);
      else await createCustomRecipe(input);
      onSaved(title.trim());
    } catch (caught) {
      setError(getErrorMessage(caught, "Non è stato possibile salvare la ricetta."));
    } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Button icon="arrow-left" onPress={onClose} textColor={palette.terracotta} style={styles.back}>Torna alle idee</Button>
      <Text variant="headlineMedium" style={styles.title}>{recipe ? "Modifica la ricetta" : "La tua nuova ricetta"}</Text>
      <Text style={styles.subtitle}>{recipe ? "Le modifiche saranno disponibili a tutta la famiglia." : "Salvala per la famiglia: potrà essere votata e proposta nei menu futuri."}</Text>

      <Card mode="outlined" style={styles.card}><Card.Content>
        <Text variant="labelLarge" style={styles.sectionLabel}>INFORMAZIONI</Text>
        <TextInput mode="outlined" label="Nome della ricetta" value={title} onChangeText={setTitle} style={styles.field} />
        <TextInput mode="outlined" label="Descrizione facoltativa" value={description} onChangeText={setDescription} multiline numberOfLines={3} style={styles.field} />
        <View style={styles.row}><TextInput mode="outlined" label="Porzioni" value={servings} onChangeText={setServings} keyboardType="number-pad" style={styles.third} /><TextInput mode="outlined" label="Prep. min" value={prepMinutes} onChangeText={setPrepMinutes} keyboardType="number-pad" style={styles.third} /><TextInput mode="outlined" label="Cottura min" value={cookMinutes} onChangeText={setCookMinutes} keyboardType="number-pad" style={styles.third} /></View>
        <Text style={styles.smallLabel}>DIFFICOLTÀ</Text>
        <SegmentedButtons value={difficulty} onValueChange={(value) => setDifficulty(value as NewRecipeInput["difficulty"])} buttons={[{ value: "easy", label: "Facile" }, { value: "medium", label: "Media" }, { value: "advanced", label: "Esperta" }]} style={styles.field} />
        <Text style={styles.smallLabel}>FONTE PROTEICA PRINCIPALE</Text>
        <SegmentedButtons value={mainProtein} onValueChange={setMainProtein} buttons={[{ value: "plant", label: "Vegetale" }, { value: "fish", label: "Pesce" }, { value: "meat", label: "Carne" }]} />
        <View style={styles.proteinRow}><Button compact mode={mainProtein === "eggs" ? "contained" : "outlined"} onPress={() => setMainProtein("eggs")}>Uova</Button><Button compact mode={mainProtein === "legumes" ? "contained" : "outlined"} onPress={() => setMainProtein("legumes")}>Legumi</Button><Button compact mode={mainProtein === "mixed" ? "contained" : "outlined"} onPress={() => setMainProtein("mixed")}>Mista</Button></View>
      </Card.Content></Card>

      <Card mode="outlined" style={styles.card}><Card.Content>
        <View style={styles.sectionRow}><Text variant="labelLarge" style={styles.sectionLabel}>INGREDIENTI</Text><Button compact icon="plus" onPress={() => setIngredients((items) => [...items, { name: "", quantity: "", unit: "g" }])}>Aggiungi</Button></View>
        {ingredients.map((item, index) => <View key={`ingredient-${index}`}><View style={styles.ingredientRow}><TextInput mode="outlined" label={`Ingrediente ${index + 1}`} value={item.name} onChangeText={(value) => updateIngredient(index, "name", value)} style={styles.ingredientName} /><TextInput mode="outlined" label="Qtà" value={item.quantity} onChangeText={(value) => updateIngredient(index, "quantity", value)} keyboardType="decimal-pad" style={styles.quantity} /><TextInput mode="outlined" label="Unità" value={item.unit} onChangeText={(value) => updateIngredient(index, "unit", value)} style={styles.unit} />{ingredients.length > 1 ? <IconButton icon="close" onPress={() => removeIngredient(index)} /> : null}</View>{index < ingredients.length - 1 ? <Divider style={styles.divider} /> : null}</View>)}
      </Card.Content></Card>

      <Card mode="outlined" style={styles.card}><Card.Content>
        <View style={styles.sectionRow}><Text variant="labelLarge" style={styles.sectionLabel}>PROCEDIMENTO</Text><Button compact icon="plus" onPress={() => setSteps((items) => [...items, ""])}>Aggiungi</Button></View>
        {steps.map((step, index) => <View key={`step-${index}`} style={styles.stepRow}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View><TextInput mode="outlined" label="Istruzione" value={step} onChangeText={(value) => updateStep(index, value)} multiline style={styles.stepInput} />{steps.length > 1 ? <IconButton icon="close" onPress={() => setSteps((items) => items.filter((_, itemIndex) => itemIndex !== index))} /> : null}</View>)}
      </Card.Content></Card>
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      <Button mode="contained" icon="content-save-outline" onPress={save} loading={busy} disabled={busy} contentStyle={styles.saveButton}>{recipe ? "Salva le modifiche" : "Salva la ricetta"}</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: "flex-start", marginLeft: -10, marginBottom: 8 }, title: { color: palette.forest, fontWeight: "800" }, subtitle: { color: palette.muted, lineHeight: 22, marginTop: 7, marginBottom: 20 }, card: { borderRadius: 6, borderColor: palette.line, backgroundColor: palette.paper, marginBottom: 14 }, sectionLabel: { color: palette.terracotta, letterSpacing: 1, fontSize: 11, fontWeight: "900" }, sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }, field: { marginTop: 13 }, row: { flexDirection: "row", gap: 8, marginTop: 13 }, third: { flex: 1 }, smallLabel: { color: palette.muted, fontSize: 10, fontWeight: "800", letterSpacing: 0.8, marginTop: 18, marginBottom: 8 }, proteinRow: { flexDirection: "row", gap: 8, marginTop: 9 }, ingredientRow: { flexDirection: "row", alignItems: "center", gap: 7 }, ingredientName: { flex: 1 }, quantity: { width: 72 }, unit: { width: 74 }, divider: { marginVertical: 10 }, stepRow: { flexDirection: "row", alignItems: "center", marginBottom: 11 }, stepNumber: { width: 30, height: 30, borderRadius: 4, backgroundColor: palette.terracotta, alignItems: "center", justifyContent: "center", marginRight: 9 }, stepNumberText: { color: "#FFF", fontWeight: "900" }, stepInput: { flex: 1 }, saveButton: { minHeight: 54 },
});
