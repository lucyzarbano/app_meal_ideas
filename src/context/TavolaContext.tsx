import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import { initialRecipes } from "../data/seed";
import { CustomRecipe, FamilyMember, NewRecipeInput, Recipe, SuggestedRecipe } from "../types";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";

export type DietaryInput = { kind: "allergy" | "intolerance" | "dislike"; label: string };

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });

type TavolaContextValue = {
  ingredients: string[]; recipes: Recipe[]; reminder: boolean; family: FamilyMember[];
  customRecipes: CustomRecipe[]; customRecipesLoading: boolean;
  suggestedRecipes: SuggestedRecipe[]; suggestionsLoading: boolean;
  addIngredient: (value: string) => void; removeIngredient: (value: string) => void;
  familyLoading: boolean; familyError: string;
  voteRecipe: (id: number, rating: number) => void; addFamilyMember: (name: string, dietary?: DietaryInput) => Promise<void>;
  reloadFamily: () => Promise<void>;
  createCustomRecipe: (input: NewRecipeInput) => Promise<string>;
  updateCustomRecipe: (recipeId: string, input: NewRecipeInput) => Promise<void>;
  deleteCustomRecipe: (recipeId: string) => Promise<void>;
  rateCustomRecipe: (recipeId: string, memberId: string, rating: number) => Promise<void>;
  reloadCustomRecipes: () => Promise<void>;
  findRecipeSuggestions: (memberIds: string[]) => Promise<void>;
  personalizeRecipe: (recipeId: string) => Promise<void>;
  updateReminder: (enabled: boolean) => Promise<void>;
};

const TavolaContext = createContext<TavolaContextValue | null>(null);

export function TavolaProvider({ children }: PropsWithChildren) {
  const { user, family: authFamily } = useAuth();
  const storageKey = `@tavola/family-state-v3:${user?.id ?? "guest"}`;
  const [ingredients, setIngredients] = useState(["zucchine", "uova", "ceci"]);
  const [recipes, setRecipes] = useState(initialRecipes);
  const [reminder, setReminder] = useState(false);
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [familyLoading, setFamilyLoading] = useState(true);
  const [familyError, setFamilyError] = useState("");
  const [customRecipes, setCustomRecipes] = useState<CustomRecipe[]>([]);
  const [customRecipesLoading, setCustomRecipesLoading] = useState(true);
  const [suggestedRecipes, setSuggestedRecipes] = useState<SuggestedRecipe[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((raw) => {
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<{ ingredients: string[]; recipes: Recipe[]; reminder: boolean }>;
      if (saved.ingredients) setIngredients(saved.ingredients);
      if (saved.recipes) setRecipes(saved.recipes);
      if (typeof saved.reminder === "boolean") setReminder(saved.reminder);
    }).catch(() => undefined).finally(() => setHydrated(true));
  }, [storageKey]);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(storageKey, JSON.stringify({ ingredients, recipes, reminder })).catch(() => undefined);
  }, [hydrated, ingredients, recipes, reminder, storageKey]);

  const reloadFamily = useCallback(async () => {
    if (!authFamily?.id) return;
    setFamilyLoading(true);
    setFamilyError("");
    try {
      const { data, error } = await supabase
        .from("family_members")
        .select("id, display_name, linked_user_id, member_dietary_needs(kind, label), member_food_preferences(label, preference)")
        .eq("family_id", authFamily.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const colors = ["#009696", "#334E68", "#667085", "#007575"];
      const members = (data ?? []).map((row, index) => {
        const needs = (row.member_dietary_needs ?? []).map((need) => `${need.kind === "allergy" ? "Allergia" : need.kind === "intolerance" ? "Intolleranza" : "Indicazione"}: ${need.label}`);
        const dislikes = (row.member_food_preferences ?? []).filter((item) => item.preference < 0).map((item) => `Non piace: ${item.label}`);
        return {
          id: row.id,
          name: row.display_name,
          role: row.linked_user_id === user?.id ? "Organizzatrice" : "Familiare",
          avatar: row.display_name.charAt(0).toUpperCase(),
          color: colors[index % colors.length] ?? "#009696",
          notes: [...needs, ...dislikes].join(" · ") || "Nessuna indicazione alimentare",
        };
      });
      setFamily(members);
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error ? String(error.message) : "Impossibile caricare i familiari.";
      setFamilyError(message);
    } finally {
      setFamilyLoading(false);
    }
  }, [authFamily?.id, user?.id]);

  useEffect(() => { reloadFamily(); }, [reloadFamily]);

  const reloadCustomRecipes = useCallback(async () => {
    if (!authFamily?.id) return;
    setCustomRecipesLoading(true);
    try {
      const { data, error } = await supabase
        .from("recipes")
        .select("id, parent_recipe_id, title, description, servings, prep_minutes, cook_minutes, difficulty, main_protein, recipe_ratings(rating)")
        .eq("family_id", authFamily.id)
        .eq("source", "custom")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCustomRecipes((data ?? []).map((recipe) => {
        const ratings = (recipe.recipe_ratings ?? []).map((item) => item.rating);
        const average = ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 0;
        return {
          id: recipe.id,
          parentRecipeId: recipe.parent_recipe_id,
          title: recipe.title,
          description: recipe.description ?? "",
          servings: recipe.servings,
          prepMinutes: recipe.prep_minutes ?? 0,
          cookMinutes: recipe.cook_minutes ?? 0,
          difficulty: recipe.difficulty ?? "easy",
          mainProtein: recipe.main_protein,
          rating: Math.round(average),
          votes: ratings.length,
        };
      }));
    } catch (error) {
      console.error("[Tavola] Impossibile caricare le ricette:", error);
    } finally {
      setCustomRecipesLoading(false);
    }
  }, [authFamily?.id]);

  useEffect(() => { reloadCustomRecipes(); }, [reloadCustomRecipes]);

  const addIngredient = (value: string) => { const clean = value.trim().toLowerCase(); if (clean && !ingredients.includes(clean)) setIngredients((items) => [...items, clean]); };
  const removeIngredient = (value: string) => setIngredients((items) => items.filter((item) => item !== value));
  const voteRecipe = (id: number, rating: number) => setRecipes((items) => items.map((recipe) => recipe.id === id ? { ...recipe, rating, votes: recipe.votes + 1 } : recipe));
  const addFamilyMember = async (name: string, dietary?: DietaryInput) => {
    if (!authFamily?.id) throw new Error("Famiglia non disponibile.");
    const { data: member, error: memberError } = await supabase
      .from("family_members")
      .insert({ family_id: authFamily.id, display_name: name.trim() })
      .select("id")
      .single();
    if (memberError) throw memberError;

    if (dietary?.label.trim()) {
      const label = dietary.label.trim();
      const itemKey = label.toLocaleLowerCase("it-IT").replace(/[^a-z0-9àèéìòù]+/gi, "-").replace(/^-|-$/g, "");
      if (dietary.kind === "dislike") {
        const { error } = await supabase.from("member_food_preferences").insert({ member_id: member.id, item_type: "ingredient", item_key: itemKey, label, preference: -2, learned_from: "declared" });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("member_dietary_needs").insert({ member_id: member.id, kind: dietary.kind, item_key: itemKey, label });
        if (error) throw error;
      }
    }
    await reloadFamily();
  };
  const createCustomRecipe = async (input: NewRecipeInput) => {
    if (!authFamily?.id) throw new Error("Famiglia non disponibile.");
    const { data, error } = await supabase.rpc("create_custom_recipe", {
      p_family_id: authFamily.id,
      p_title: input.title,
      p_description: input.description,
      p_servings: input.servings,
      p_prep_minutes: input.prepMinutes,
      p_cook_minutes: input.cookMinutes,
      p_difficulty: input.difficulty,
      p_main_protein: input.mainProtein,
      p_ingredients: input.ingredients,
      p_steps: input.steps,
    });
    if (error) throw error;
    await reloadCustomRecipes();
    return String(data);
  };
  const updateCustomRecipe = async (recipeId: string, input: NewRecipeInput) => {
    const { error } = await supabase.rpc("update_custom_recipe", {
      p_recipe_id: recipeId,
      p_title: input.title,
      p_description: input.description,
      p_servings: input.servings,
      p_prep_minutes: input.prepMinutes,
      p_cook_minutes: input.cookMinutes,
      p_difficulty: input.difficulty,
      p_main_protein: input.mainProtein,
      p_ingredients: input.ingredients,
      p_steps: input.steps,
    });
    if (error) throw error;
    await reloadCustomRecipes();
  };
  const deleteCustomRecipe = async (recipeId: string) => {
    const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
    if (error) throw error;
    await reloadCustomRecipes();
  };
  const rateCustomRecipe = async (recipeId: string, memberId: string, rating: number) => {
    const { error } = await supabase.from("recipe_ratings").upsert(
      { recipe_id: recipeId, member_id: memberId, rating },
      { onConflict: "recipe_id,member_id" },
    );
    if (error) throw error;
    await reloadCustomRecipes();
  };
  const findRecipeSuggestions = async (memberIds: string[]) => {
    if (!authFamily?.id) throw new Error("Famiglia non disponibile.");
    setSuggestionsLoading(true);
    try {
      const params = {
        p_family_id: authFamily.id,
        p_ingredient_names: ingredients,
        p_member_ids: memberIds,
        p_limit: 3,
      };
      const { data, error } = await supabase.rpc("recommend_recipes", params);
      if (error) {
        if (error.message.includes("recommend_recipes") || error.code === "PGRST202") {
          throw new Error("La funzione dei suggerimenti non è ancora installata: esegui la migrazione 005 nel SQL Editor di Supabase.");
        }
        throw error;
      }

      const overriddenCatalogIds = new Set(customRecipes.flatMap((recipe) => recipe.parentRecipeId ? [recipe.parentRecipeId] : []));
      let rows = (data ?? []).filter((item: { recipe_id: string }) => !overriddenCatalogIds.has(item.recipe_id));
      if (rows.length < 3 && ingredients.length > 0) {
        const { data: fallbackData, error: fallbackError } = await supabase.rpc("recommend_recipes", {
          ...params,
          p_ingredient_names: [],
          p_limit: 3,
        });
        if (fallbackError) throw fallbackError;
        const existingIds = new Set(rows.map((item: { recipe_id: string }) => item.recipe_id));
        rows = [...rows, ...(fallbackData ?? []).filter((item: { recipe_id: string }) => !existingIds.has(item.recipe_id) && !overriddenCatalogIds.has(item.recipe_id))].slice(0, 3);
      }

      setSuggestedRecipes(rows.map((recipe: {
        recipe_id: string; title: string; description: string | null; prep_minutes: number | null;
        cook_minutes: number | null; difficulty: string | null; main_protein: string | null;
        image_key: string | null; match_score: number | string; taste_score: number | string;
        variety_score: number | string; total_score: number | string; rating_average: number | string;
        rating_count: number | string; reason: string;
      }) => ({
        id: recipe.recipe_id,
        title: recipe.title,
        description: recipe.description ?? "",
        prepMinutes: recipe.prep_minutes ?? 0,
        cookMinutes: recipe.cook_minutes ?? 0,
        difficulty: recipe.difficulty ?? "easy",
        mainProtein: recipe.main_protein,
        imageKey: recipe.image_key,
        matchScore: Number(recipe.match_score),
        tasteScore: Number(recipe.taste_score),
        varietyScore: Number(recipe.variety_score),
        totalScore: Number(recipe.total_score),
        rating: Math.round(Number(recipe.rating_average)),
        votes: Number(recipe.rating_count),
        reason: recipe.reason,
      })));
    } finally { setSuggestionsLoading(false); }
  };
  const personalizeRecipe = async (recipeId: string) => {
    if (!authFamily?.id) throw new Error("Famiglia non disponibile.");
    const { error } = await supabase.rpc("clone_recipe_for_family", {
      p_recipe_id: recipeId,
      p_family_id: authFamily.id,
      p_title: null,
    });
    if (error) throw error;
    await reloadCustomRecipes();
  };
  const updateReminder = async (enabled: boolean) => {
    if (!enabled) { await Notifications.cancelAllScheduledNotificationsAsync(); setReminder(false); return; }
    const current = await Notifications.getPermissionsAsync();
    const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
    if (!permission.granted) { Alert.alert("Notifiche non abilitate", "Puoi abilitarle dalle impostazioni del telefono quando vuoi."); return; }
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({ content: { title: "Prepariamo domani 🍽️", body: "Controlla il menu e quello che serve preparare per domani." }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 20, minute: 30 } });
    setReminder(true);
  };

  return <TavolaContext.Provider value={{ ingredients, recipes, reminder, family, familyLoading, familyError, customRecipes, customRecipesLoading, suggestedRecipes, suggestionsLoading, addIngredient, removeIngredient, voteRecipe, addFamilyMember, reloadFamily, createCustomRecipe, updateCustomRecipe, deleteCustomRecipe, rateCustomRecipe, reloadCustomRecipes, findRecipeSuggestions, personalizeRecipe, updateReminder }}>{children}</TavolaContext.Provider>;
}

export function useTavola() { const value = useContext(TavolaContext); if (!value) throw new Error("useTavola deve essere usato dentro TavolaProvider"); return value; }
