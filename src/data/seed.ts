import { FamilyMember, MenuDay, Recipe } from "../types";

export const menuDays: MenuDay[] = [
  { short: "LUN", day: "12", meal: "Pasta al pesto", emoji: "🍝", color: "#E7EEF5" },
  { short: "MAR", day: "13", meal: "Pollo e verdure", emoji: "🍗", color: "#D5EEEE" },
  { short: "MER", day: "14", meal: "Zuppa di ceci", emoji: "🥣", color: "#FFF0D1" },
  { short: "GIO", day: "15", meal: "Da scegliere", emoji: "+", color: "#E8E5DF" },
  { short: "VEN", day: "16", meal: "Pizza fatta in casa", emoji: "🍕", color: "#C6E7E7" },
  { short: "SAB", day: "17", meal: "Risotto ai funghi", emoji: "🍚", color: "#DDE5EC" },
  { short: "DOM", day: "18", meal: "Lasagne della nonna", emoji: "🍽️", color: "#F2E5D5" },
];

export const initialRecipes: Recipe[] = [
  { id: 1, title: "Frittata soffice alle zucchine", time: "25 min", match: 96, tags: ["Senza glutine", "Facile"], emoji: "🍳", color: "#D5EEEE", rating: 4, votes: 18 },
  { id: 2, title: "Pasta cremosa zucchine e limone", time: "20 min", match: 91, tags: ["Vegetariana", "Veloce"], emoji: "🍝", color: "#E7EEF5", rating: 5, votes: 12 },
  { id: 3, title: "Polpette croccanti di ceci", time: "35 min", match: 84, tags: ["Senza lattosio", "Forno"], emoji: "🧆", color: "#C6E7E7", rating: 4, votes: 9 },
];

export const initialFamily: FamilyMember[] = [
  { id: "demo-lucia", name: "Lucia", role: "Organizzatrice", avatar: "L", color: "#009696", notes: "Nessuna intolleranza" },
  { id: "demo-marco", name: "Marco", role: "Adulto", avatar: "M", color: "#334E68", notes: "Senza lattosio" },
  { id: "demo-sofia", name: "Sofia", role: "Bambina", avatar: "S", color: "#667085", notes: "Allergia alle arachidi" },
];
