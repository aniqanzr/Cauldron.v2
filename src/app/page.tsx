"use client";

import {
  Bell,
  Bot,
  CalendarClock,
  Camera,
  Check,
  ChefHat,
  ChevronRight,
  Clock3,
  Flame,
  Home,
  Leaf,
  LogOut,
  MessageCircle,
  Minus,
  PackageOpen,
  Plus,
  RefreshCw,
  ReceiptText,
  ScanLine,
  Search,
  Send,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";
import type { Session, User } from "@supabase/supabase-js";
import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type BarcodeNutrition = {
  basis?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sugar?: number;
  fiber?: number;
  sodiumMg?: number;
  nutriScore?: string;
  servingSize?: string;
};

type PantryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiresIn: number;
  location: string;
  color: string;
  barcode?: string;
  brand?: string;
  matchedBarcode?: string;
  nutrition?: BarcodeNutrition;
  productImageUrl?: string;
  lookupSource?: "barcode" | "camera" | "openfoodfacts";
  lookupStatus?: "found" | "not_found";
  lookupMessage?: string;
};

type PantryItemRow = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  quantity: number | string;
  unit: string;
  expires_in: number | string;
  location: string;
  color: string;
};

type Recipe = {
  id: string;
  name: string;
  time: string;
  style: string;
  energy: string;
  ingredients: string[];
  optionalMissing: string[];
  highlight: string;
};

type RecipeMatch = Recipe & {
  available: string[];
  missing: string[];
  match: number;
};

type AiRecommendation = RecipeMatch;

type CookingRecipe = RecipeMatch & {
  prepNotes: string[];
  instructions: string[];
};

type PantryAction = {
  type: "add" | "remove" | "update" | "clear";
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
  expiresIn?: number;
  location?: string;
  reason?: string;
};

type ShoppingSuggestion = {
  name: string;
  reason: string;
  goal: string;
  priority: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  ready?: AiRecommendation[];
  stretch?: AiRecommendation[];
  pantryActions?: PantryAction[];
  shoppingList?: ShoppingSuggestion[];
  nutritionNotes?: string[];
  loading?: boolean;
  source?: "gemini" | "local";
};

type BarcodeDetectorResult = {
  rawValue: string;
  format?: string;
};

type BarcodeDetectorShape = {
  detect: (source: CanvasImageSource) => Promise<BarcodeDetectorResult[]>;
};

type BarcodeDetectorConstructor = new () => BarcodeDetectorShape;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

type DetectedBarcodeItem = {
  barcode: string;
  productName?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  expiresIn?: number;
  brand?: string;
  matchedBarcode?: string;
  nutrition?: BarcodeNutrition;
  productImageUrl?: string;
  lookupSource?: "barcode" | "camera" | "openfoodfacts";
  lookupStatus?: "found" | "not_found";
  lookupMessage?: string;
};

type DetectedReceiptItem = {
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  expiresIn?: number;
};

type ReceiptScanResponse = {
  storeName?: string;
  items?: DetectedReceiptItem[];
  error?: string;
};

type AuthMode = "sign-in" | "sign-up";

type SyncStatus = "idle" | "loading" | "saving" | "saved" | "error";

type SupabasePantryError = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

type AuthApiResponse = {
  session?: Session | null;
  user?: User | null;
  error?: string;
  code?: string;
};

type PantryApiResponse = {
  items?: PantryItemRow[];
  error?: string;
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

type TabId = "home" | "pantry" | "scan" | "chat" | "recipes";

const authSessionStorageKey = "cauldron-auth-session";

const pantrySeed: PantryItem[] = [
  {
    id: "eggs",
    name: "Eggs",
    category: "Protein",
    quantity: 8,
    unit: "count",
    expiresIn: 2,
    location: "Fridge",
    color: "bg-amber-100 text-amber-800",
  },
  {
    id: "spinach",
    name: "Spinach",
    category: "Produce",
    quantity: 1,
    unit: "bunch",
    expiresIn: 1,
    location: "Crisper",
    color: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "greek-yogurt",
    name: "Greek yogurt",
    category: "Dairy",
    quantity: 0.5,
    unit: "tub",
    expiresIn: 3,
    location: "Fridge",
    color: "bg-sky-100 text-sky-800",
  },
  {
    id: "cherry-tomatoes",
    name: "Cherry tomatoes",
    category: "Produce",
    quantity: 14,
    unit: "count",
    expiresIn: 4,
    location: "Counter",
    color: "bg-rose-100 text-rose-800",
  },
  {
    id: "milk",
    name: "Milk",
    category: "Dairy",
    quantity: 1,
    unit: "L",
    expiresIn: 2,
    location: "Fridge",
    color: "bg-cyan-100 text-cyan-800",
  },
  {
    id: "chicken-thighs",
    name: "Chicken thighs",
    category: "Protein",
    quantity: 600,
    unit: "g",
    expiresIn: 5,
    location: "Freezer",
    color: "bg-orange-100 text-orange-800",
  },
  {
    id: "rice",
    name: "Rice",
    category: "Grains",
    quantity: 2,
    unit: "kg",
    expiresIn: 80,
    location: "Pantry",
    color: "bg-stone-200 text-stone-800",
  },
  {
    id: "garlic",
    name: "Garlic",
    category: "Produce",
    quantity: 5,
    unit: "cloves",
    expiresIn: 22,
    location: "Pantry",
    color: "bg-violet-100 text-violet-800",
  },
  {
    id: "pasta",
    name: "Pasta",
    category: "Grains",
    quantity: 500,
    unit: "g",
    expiresIn: 120,
    location: "Pantry",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    id: "chickpeas",
    name: "Chickpeas",
    category: "Canned",
    quantity: 2,
    unit: "cans",
    expiresIn: 365,
    location: "Pantry",
    color: "bg-lime-100 text-lime-800",
  },
];

function createBarcodeItem(detectedItem: DetectedBarcodeItem): PantryItem {
  const barcode = detectedItem.barcode.trim();
  const compactCode = barcode.length > 4 ? barcode.slice(-4) : barcode;
  const name = detectedItem.productName?.trim() || `Scanned item ${compactCode}`;
  const category = detectedItem.category?.trim() || "Barcode";

  return {
    id: idFromName(`barcode-${barcode}`),
    name,
    category,
    quantity: detectedItem.quantity && detectedItem.quantity > 0 ? detectedItem.quantity : 1,
    unit: detectedItem.unit?.trim() || "item",
    expiresIn: detectedItem.expiresIn && detectedItem.expiresIn > 0 ? detectedItem.expiresIn : 14,
    location: "Pantry",
    color: colorForCategory(category),
    barcode,
    brand: detectedItem.brand,
    matchedBarcode: detectedItem.matchedBarcode,
    nutrition: detectedItem.nutrition,
    productImageUrl: detectedItem.productImageUrl,
    lookupSource: detectedItem.lookupSource,
    lookupStatus: detectedItem.lookupStatus,
    lookupMessage: detectedItem.lookupMessage,
  };
}

function createReceiptItem(detectedItem: DetectedReceiptItem, index: number): PantryItem {
  const name = detectedItem.name.trim();
  const category = detectedItem.category?.trim() || "Other";

  return {
    id: idFromName(`receipt-${name}-${index}`),
    name,
    category,
    quantity: detectedItem.quantity && detectedItem.quantity > 0 ? detectedItem.quantity : 1,
    unit: detectedItem.unit?.trim() || "item",
    expiresIn: detectedItem.expiresIn && detectedItem.expiresIn > 0 ? detectedItem.expiresIn : 14,
    location: "Pantry",
    color: colorForCategory(category),
  };
}

function formatNutritionNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function formatNutritionGrams(value?: number) {
  return value === undefined ? undefined : `${formatNutritionNumber(value)}g`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Could not read receipt image."));
    });
    reader.addEventListener("error", () => reject(new Error("Could not read receipt image.")));
    reader.readAsDataURL(file);
  });
}

function pantryRowToItem(row: PantryItemRow): PantryItem {
  const category = row.category || "Other";

  return {
    id: row.id,
    name: row.name,
    category,
    quantity: Number(row.quantity) || 1,
    unit: row.unit || "item",
    expiresIn: Number(row.expires_in) || 0,
    location: row.location || "Pantry",
    color: row.color || colorForCategory(category),
  };
}

function serializePantry(items: PantryItem[]) {
  return JSON.stringify(
    [...items]
      .map((item) => ({
        ...item,
        quantity: Number(item.quantity.toFixed(2)),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  );
}

function localPantryKey(userId: string) {
  return `cauldron-pantry:${userId}`;
}

function normalizeStoredPantryItem(item: Partial<PantryItem>): PantryItem | null {
  if (!item.id || !item.name) {
    return null;
  }

  const category = item.category || "Other";

  return {
    id: item.id,
    name: item.name,
    category,
    quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
    unit: item.unit || "item",
    expiresIn: Number(item.expiresIn) >= 0 ? Number(item.expiresIn) : 14,
    location: item.location || "Pantry",
    color: item.color || colorForCategory(category),
    barcode: item.barcode,
    brand: item.brand,
    matchedBarcode: item.matchedBarcode,
    nutrition: item.nutrition,
    productImageUrl: item.productImageUrl,
    lookupSource: item.lookupSource,
    lookupStatus: item.lookupStatus,
    lookupMessage: item.lookupMessage,
  };
}

function loadLocalPantry(userId: string) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedPantry = window.localStorage.getItem(localPantryKey(userId));
    const parsed = storedPantry ? JSON.parse(storedPantry) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeStoredPantryItem(item as Partial<PantryItem>))
      .filter((item): item is PantryItem => item !== null);
  } catch {
    return [];
  }
}

function saveLocalPantry(userId: string, items: PantryItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(localPantryKey(userId), serializePantry(items));
}

function readStoredAuthSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedSession = window.localStorage.getItem(authSessionStorageKey);
    const session = storedSession ? (JSON.parse(storedSession) as Partial<Session>) : null;

    if (!session?.access_token || !session.refresh_token || !session.user?.id) {
      return null;
    }

    return session as Session;
  } catch {
    return null;
  }
}

function saveAuthSession(session: Session | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(authSessionStorageKey);
    return;
  }

  window.localStorage.setItem(authSessionStorageKey, JSON.stringify(session));
}

function shouldRefreshSession(session: Session) {
  if (!session.expires_at) {
    return false;
  }

  return Date.now() / 1000 > session.expires_at - 60;
}

function authHeaders(session: Session | null): Record<string, string> {
  return session?.access_token
    ? {
        Authorization: `Bearer ${session.access_token}`,
      }
    : {};
}

function apiErrorFromPayload(payload: unknown, fallbackMessage: string) {
  const data =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const message =
    typeof data.error === "string"
      ? data.error
      : typeof data.message === "string"
        ? data.message
        : fallbackMessage;
  const error = new Error(message) as Error & SupabasePantryError;

  if (typeof data.code === "string") {
    error.code = data.code;
  }

  if (typeof data.details === "string") {
    error.details = data.details;
  }

  if (typeof data.hint === "string") {
    error.hint = data.hint;
  }

  return error;
}

async function apiRequest<T>(
  path: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<T> {
  try {
    const response = await fetch(path, init);
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw apiErrorFromPayload(payload, fallbackMessage);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof TypeError && error.message.toLowerCase().includes("failed to fetch")) {
      throw new Error(
        `${fallbackMessage} The Cauldron app server is not reachable. Restart the Next dev server and try again.`,
      );
    }

    throw error;
  }
}

function pantrySyncErrorMessage(error: SupabasePantryError) {
  const message = error.message || "Could not sync pantry";
  const code = error.code || "";
  const lowerMessage = message.toLowerCase();

  if (code === "42P01" || code === "PGRST205" || lowerMessage.includes("does not exist")) {
    return "Cloud pantry table is missing. Run the pantry_items setup SQL. Saved locally on this device.";
  }

  if (code === "42703" || lowerMessage.includes("column")) {
    return `Cloud pantry table has different columns. Run the reset pantry_items SQL. Saved locally. ${message}`;
  }

  if (code === "42501" || lowerMessage.includes("row-level security") || lowerMessage.includes("permission")) {
    return `Cloud pantry privacy rules need setup. Run the pantry_items setup SQL. Saved locally. ${message}`;
  }

  return `Cloud pantry setup needs attention. Saved locally. ${message}`;
}

async function replaceSupabasePantry(session: Session, items: PantryItem[]) {
  await apiRequest<PantryApiResponse>(
    "/api/pantry",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(session),
      },
      body: JSON.stringify({ items }),
    },
    "Could not save pantry.",
  );
}

const recipes: Recipe[] = [
  {
    id: "frittata",
    name: "Spinach Tomato Frittata",
    time: "18 min",
    style: "Breakfast",
    energy: "Use tonight",
    ingredients: ["eggs", "spinach", "cherry tomatoes", "milk"],
    optionalMissing: ["feta"],
    highlight: "Clears 3 expiring ingredients",
  },
  {
    id: "rice-bowl",
    name: "Garlic Chicken Rice Bowls",
    time: "28 min",
    style: "Dinner",
    energy: "High protein",
    ingredients: ["chicken thighs", "rice", "garlic"],
    optionalMissing: ["lime", "cucumber"],
    highlight: "Freezer-friendly batch meal",
  },
  {
    id: "yogurt-pasta",
    name: "Creamy Yogurt Pasta",
    time: "16 min",
    style: "Quick lunch",
    energy: "Low waste",
    ingredients: ["greek yogurt", "pasta", "garlic", "cherry tomatoes"],
    optionalMissing: ["parmesan"],
    highlight: "Uses yogurt before it turns",
  },
  {
    id: "curry",
    name: "Chickpea Pantry Curry",
    time: "24 min",
    style: "One pot",
    energy: "Shelf-stable",
    ingredients: ["chickpeas", "rice", "garlic"],
    optionalMissing: ["coconut milk", "curry paste"],
    highlight: "Built from pantry staples",
  },
];

const aiRecipeCatalog: Recipe[] = [
  ...recipes,
  {
    id: "tomato-chickpea-pasta",
    name: "Tomato Chickpea Pasta",
    time: "19 min",
    style: "Lunch",
    energy: "Pantry boost",
    ingredients: ["chickpeas", "pasta", "cherry tomatoes", "garlic"],
    optionalMissing: [],
    highlight: "A fast meal from canned and dry goods",
  },
  {
    id: "yogurt-egg-bowl",
    name: "Jammy Eggs with Yogurt Rice",
    time: "14 min",
    style: "Brunch",
    energy: "Use soon",
    ingredients: ["eggs", "greek yogurt", "rice", "garlic"],
    optionalMissing: [],
    highlight: "Uses eggs and yogurt before they expire",
  },
  {
    id: "chicken-yogurt-flatbreads",
    name: "Garlic Chicken Yogurt Flatbreads",
    time: "30 min",
    style: "Dinner",
    energy: "2-item shop",
    ingredients: ["chicken thighs", "greek yogurt", "garlic", "flatbread", "cucumber"],
    optionalMissing: [],
    highlight: "Turns pantry protein into a fresh wrap night",
  },
  {
    id: "tomato-shakshuka",
    name: "Cherry Tomato Shakshuka",
    time: "24 min",
    style: "One pan",
    energy: "1-item shop",
    ingredients: ["eggs", "cherry tomatoes", "garlic", "paprika"],
    optionalMissing: [],
    highlight: "A saucy egg dinner with one spice upgrade",
  },
  {
    id: "coconut-chickpea-curry",
    name: "Coconut Chickpea Curry",
    time: "26 min",
    style: "Dinner",
    energy: "2-item shop",
    ingredients: ["chickpeas", "rice", "garlic", "coconut milk", "curry paste"],
    optionalMissing: [],
    highlight: "A richer version of the pantry curry",
  },
  {
    id: "spinach-feta-pasta",
    name: "Spinach Feta Pasta",
    time: "17 min",
    style: "Quick lunch",
    energy: "1-item shop",
    ingredients: ["spinach", "pasta", "garlic", "feta"],
    optionalMissing: [],
    highlight: "Uses spinach fast with one salty add-on",
  },
];

const tabItems = [
  { id: "home" as const, label: "Home", icon: Home },
  { id: "pantry" as const, label: "Pantry", icon: PackageOpen },
  { id: "scan" as const, label: "Scan", icon: ScanLine },
  { id: "chat" as const, label: "Ask", icon: MessageCircle },
  { id: "recipes" as const, label: "Cook", icon: ChefHat },
];

const normalized = (value: string) => value.toLowerCase().trim();

const idFromName = (value: string) =>
  normalized(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const formatIngredient = (value: string) =>
  value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

function isClearPantryPrompt(prompt: string) {
  const lowerPrompt = normalized(prompt);
  const hasClearVerb = /\b(clear|empty|remove|delete)\b/.test(lowerPrompt);
  const hasEverything = /\b(all|everything|entire|every)\b/.test(lowerPrompt);
  const hasPantryTarget = /\b(pantry|items|ingredients|food)\b/.test(lowerPrompt);

  return (
    (hasClearVerb && hasEverything && hasPantryTarget) ||
    /\b(clear|empty)\s+(the\s+)?pantry\b/.test(lowerPrompt)
  );
}

function colorForCategory(category: string) {
  const key = normalized(category);

  if (key.includes("protein")) return "bg-orange-100 text-orange-800";
  if (key.includes("produce")) return "bg-emerald-100 text-emerald-800";
  if (key.includes("dairy")) return "bg-sky-100 text-sky-800";
  if (key.includes("grain")) return "bg-yellow-100 text-yellow-800";
  if (key.includes("canned")) return "bg-lime-100 text-lime-800";
  if (key.includes("bakery")) return "bg-amber-100 text-amber-800";

  return "bg-stone-200 text-stone-800";
}

function buildAiRecommendations(prompt: string, pantryNames: Set<string>) {
  const normalizedPrompt = normalized(prompt);
  const allIngredients = Array.from(
    new Set(aiRecipeCatalog.flatMap((recipe) => recipe.ingredients)),
  );
  const requestedIngredients = allIngredients.filter((ingredient) =>
    normalizedPrompt.includes(ingredient),
  );

  const scored = aiRecipeCatalog
    .map((recipe) => {
      const available = recipe.ingredients.filter((ingredient) =>
        pantryNames.has(ingredient),
      );
      const missing = recipe.ingredients.filter(
        (ingredient) => !pantryNames.has(ingredient),
      );
      const requestedMatch = requestedIngredients.filter((ingredient) =>
        recipe.ingredients.includes(ingredient),
      ).length;
      const expiryBoost = recipe.ingredients.some((ingredient) =>
        ["eggs", "spinach", "milk", "greek yogurt", "cherry tomatoes"].includes(
          ingredient,
        ),
      )
        ? 2
        : 0;
      const match = Math.round((available.length / recipe.ingredients.length) * 100);

      return {
        ...recipe,
        available,
        missing,
        match,
        score: requestedMatch * 20 + available.length * 3 - missing.length * 8 + expiryBoost,
      };
    })
    .sort((a, b) => b.score - a.score || b.match - a.match);
  const toRecommendation = (recipe: (typeof scored)[number]): AiRecommendation => ({
    id: recipe.id,
    name: recipe.name,
    time: recipe.time,
    style: recipe.style,
    energy: recipe.energy,
    ingredients: recipe.ingredients,
    optionalMissing: recipe.optionalMissing,
    highlight: recipe.highlight,
    available: recipe.available,
    missing: recipe.missing,
    match: recipe.match,
  });

  const ready = scored
    .filter((recipe) => recipe.missing.length === 0)
    .slice(0, 3)
    .map(toRecommendation);
  const stretch = scored
    .filter((recipe) => recipe.missing.length >= 1 && recipe.missing.length <= 2)
    .slice(0, 2)
    .map(toRecommendation);

  return {
    ready,
    stretch,
    requestedIngredients,
  };
}

function createAssistantMessage(
  prompt: string,
  pantryNames: Set<string>,
  id = `assistant-${Date.now()}`,
): ChatMessage {
  if (pantryNames.size === 0) {
    return {
      id,
      role: "assistant",
      text: "Your pantry is ready. Add ingredients from Scan or ask me to add items, then I can suggest recipes from what you have.",
      ready: [],
      stretch: [],
      source: "local",
    };
  }

  const recommendations = buildAiRecommendations(prompt, pantryNames);
  const requestedText =
    recommendations.requestedIngredients.length > 0
      ? ` using ${recommendations.requestedIngredients
          .map(formatIngredient)
          .join(", ")}`
      : "";

  return {
    id,
    role: "assistant",
    text: `Here are 3 recipes you can make now${requestedText}, plus 2 ideas that need only 1-2 more ingredients.`,
    ready: recommendations.ready,
    stretch: recommendations.stretch,
    source: "local",
  };
}

function buildCookingRecipe(recipe: RecipeMatch): CookingRecipe {
  const formattedIngredients = recipe.ingredients.map(formatIngredient);
  const prepNotes = [
    `Set out ${formattedIngredients.slice(0, 4).join(", ")}${formattedIngredients.length > 4 ? ", and the rest" : ""}.`,
    recipe.missing.length > 0
      ? `Pick up ${recipe.missing.map(formatIngredient).join(", ")} before cooking.`
      : "You have everything needed in your pantry.",
    `Plan for ${recipe.time.toLowerCase()} of cooking.`,
  ];
  const recipeInstructions: Record<string, string[]> = {
    frittata: [
      "Whisk the eggs with a splash of milk, salt, and pepper.",
      "Soften the spinach and cherry tomatoes in an oven-safe pan with a little oil.",
      "Pour in the egg mixture and cook gently until the edges start to set.",
      "Finish under the grill or with a lid until the center is just set.",
      "Rest for 2 minutes, then slice and serve warm.",
    ],
    "rice-bowl": [
      "Start the rice so it can steam while the chicken cooks.",
      "Season chicken thighs with salt, pepper, and minced garlic.",
      "Sear the chicken until browned, then cover and cook through.",
      "Slice the chicken and spoon it over rice with any pan juices.",
      "Add lime or cucumber if using, then serve immediately.",
    ],
    "yogurt-pasta": [
      "Boil pasta in salted water until just tender.",
      "Warm garlic and cherry tomatoes in a pan until the tomatoes soften.",
      "Whisk Greek yogurt with a splash of pasta water to make a smooth sauce.",
      "Toss pasta through the tomatoes, then fold in the yogurt sauce off the heat.",
      "Season generously and finish with parmesan if using.",
    ],
    curry: [
      "Cook the rice first and keep it covered.",
      "Warm garlic in oil until fragrant.",
      "Add chickpeas and a splash of water, then simmer until hot.",
      "Stir in curry paste or pantry spices if using.",
      "Serve the chickpeas over rice with any fresh toppings you have.",
    ],
    "tomato-chickpea-pasta": [
      "Boil pasta in salted water and reserve a small cup of cooking water.",
      "Cook garlic and cherry tomatoes until jammy.",
      "Add chickpeas and warm them through.",
      "Toss in pasta with enough cooking water to coat everything.",
      "Season and serve with olive oil or cheese if available.",
    ],
    "yogurt-egg-bowl": [
      "Cook rice or warm leftover rice.",
      "Boil eggs until jammy, then cool briefly and peel.",
      "Stir garlic, salt, and pepper into Greek yogurt.",
      "Spoon yogurt over rice and top with halved eggs.",
      "Finish with herbs, chili oil, or any crunchy pantry topping.",
    ],
    "chicken-yogurt-flatbreads": [
      "Season chicken with garlic, salt, and pepper.",
      "Cook chicken until browned and cooked through, then slice.",
      "Stir Greek yogurt with garlic and a pinch of salt for sauce.",
      "Warm flatbreads and layer with chicken, yogurt sauce, and cucumber.",
      "Fold and serve while warm.",
    ],
    "tomato-shakshuka": [
      "Cook garlic and cherry tomatoes until saucy.",
      "Stir in paprika with salt and pepper.",
      "Make small wells in the sauce and crack in the eggs.",
      "Cover and cook until the whites are set and yolks are still soft.",
      "Serve straight from the pan.",
    ],
    "coconut-chickpea-curry": [
      "Start rice and keep it covered once cooked.",
      "Cook garlic and curry paste in oil until fragrant.",
      "Add chickpeas and coconut milk, then simmer until thickened.",
      "Taste and adjust salt, pepper, and acidity.",
      "Serve over rice.",
    ],
    "spinach-feta-pasta": [
      "Boil pasta in salted water and reserve some pasta water.",
      "Cook garlic in oil, then wilt the spinach.",
      "Toss pasta through the spinach with a splash of pasta water.",
      "Crumble in feta and stir until lightly creamy.",
      "Season and serve hot.",
    ],
  };
  const fallbackInstructions = [
    `Prep ${formattedIngredients.slice(0, 3).join(", ")}${formattedIngredients.length > 3 ? ", and the remaining ingredients" : ""}.`,
    "Start with the ingredient that takes longest to cook, then build the rest around it.",
    "Cook aromatics or firm ingredients first, then add softer pantry items near the end.",
    "Taste and adjust salt, acidity, and texture before serving.",
    `Serve as a ${recipe.style.toLowerCase()} while it is fresh.`,
  ];

  return {
    ...recipe,
    prepNotes,
    instructions: recipeInstructions[recipe.id] || fallbackInstructions,
  };
}

function createLocalActionMessage(prompt: string, id: string, pantryNames: Set<string>): ChatMessage {
  const lowerPrompt = normalized(prompt);
  const actions: PantryAction[] = [];

  if (isClearPantryPrompt(prompt)) {
    actions.push({
      type: "clear",
      name: "Pantry",
      reason: "Removed every pantry item from your chat request.",
    });
  } else if (lowerPrompt.startsWith("remove ") || lowerPrompt.startsWith("delete ")) {
    const name = prompt.replace(/^(remove|delete)\s+/i, "").trim();

    if (name) {
      actions.push({
        type: "remove",
        name,
        reason: "Removed from your pantry from the chat request.",
      });
    }
  }

  if (lowerPrompt.startsWith("add ")) {
    const value = prompt.replace(/^add\s+/i, "").trim();
    const match = value.match(/^(\d+(?:\.\d+)?)?\s*([a-zA-Z]+)?\s*(.+)$/);
    const quantity = match?.[1] ? Number(match[1]) : 1;
    const unit = match?.[2] || "item";
    const name = match?.[3]?.trim() || value;

    if (name) {
      actions.push({
        type: "add",
        name,
        quantity,
        unit,
        category: "Other",
        expiresIn: 14,
        location: "Pantry",
        reason: "Added from your chat request.",
      });
    }
  }

  if (actions.length > 0) {
    return {
      id,
      role: "assistant",
      text: "Gemini is not configured or reachable yet, so I handled the pantry change locally.",
      pantryActions: actions,
      source: "local",
    };
  }

  return createAssistantMessage(prompt, pantryNames, id);
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [pantryLoaded, setPantryLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [query, setQuery] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    createAssistantMessage(
      "Use eggs, spinach, and rice",
      new Set<string>(),
      "assistant-initial",
    ),
  ]);
  const [receiptName, setReceiptName] = useState("Upload a receipt");
  const [scanItems, setScanItems] = useState<PantryItem[]>([]);
  const [scanError, setScanError] = useState("");
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [selectedCookingRecipe, setSelectedCookingRecipe] = useState<CookingRecipe | null>(null);
  const [scanComplete, setScanComplete] = useState(true);
  const [receiptAdded, setReceiptAdded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastSavedPantryRef = useRef("");

  const pantryNames = useMemo(
    () => new Set(pantry.map((item) => normalized(item.name))),
    [pantry],
  );

  const expiringItems = useMemo(
    () =>
      [...pantry]
        .filter((item) => item.expiresIn <= 5)
        .sort((a, b) => a.expiresIn - b.expiresIn),
    [pantry],
  );

  const filteredPantry = useMemo(() => {
    const normalizedQuery = normalized(query);
    return pantry
      .filter((item) =>
        [item.name, item.category, item.location]
          .map(normalized)
          .some((value) => value.includes(normalizedQuery)),
      )
      .sort((a, b) => a.expiresIn - b.expiresIn);
  }, [pantry, query]);

  const recipeMatches = useMemo(
    () =>
      recipes.map((recipe) => {
        const available = recipe.ingredients.filter((ingredient) =>
          pantryNames.has(ingredient),
        );
        const missingBase = recipe.ingredients.filter(
          (ingredient) => !pantryNames.has(ingredient),
        );
        const missing = [...missingBase, ...recipe.optionalMissing].slice(0, 2);
        const match = Math.round((available.length / recipe.ingredients.length) * 100);

        return {
          ...recipe,
          available,
          missing,
          match,
        };
      }),
    [pantryNames],
  );

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const storedSession = readStoredAuthSession();

      if (!storedSession) {
        setAuthReady(true);
        return;
      }

      if (!shouldRefreshSession(storedSession)) {
        setAuthSession(storedSession);
        setUser(storedSession.user);
        setAuthReady(true);
        return;
      }

      try {
        const data = await apiRequest<AuthApiResponse>(
          "/api/auth",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "refresh",
              refreshToken: storedSession.refresh_token,
            }),
          },
          "Could not restore your session.",
        );

        if (!isMounted) {
          return;
        }

        if (data.session) {
          saveAuthSession(data.session);
          setAuthSession(data.session);
          setUser(data.session.user);
        } else {
          saveAuthSession(null);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        saveAuthSession(null);
        setAuthError(error instanceof Error ? error.message : "Please sign in again.");
      } finally {
        if (isMounted) {
          setAuthReady(true);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    if (!user || !authSession) {
      lastSavedPantryRef.current = "";
      return;
    }

    const userId = user.id;

    async function loadUserPantry() {
      setPantryLoaded(false);
      setSyncStatus("loading");
      setSyncMessage("Loading pantry");
      const localPantry = loadLocalPantry(userId);

      let response: PantryApiResponse;

      try {
        response = await apiRequest<PantryApiResponse>(
          "/api/pantry",
          {
            headers: authHeaders(authSession),
          },
          "Could not load pantry.",
        );
      } catch (error) {
        if (!isActive) {
          return;
        }

        lastSavedPantryRef.current = serializePantry(localPantry);
        setPantry(localPantry);
        setPantryLoaded(true);
        setSyncStatus("error");
        setSyncMessage(pantrySyncErrorMessage(error as SupabasePantryError));
        return;
      }

      if (!isActive) {
        return;
      }

      const cloudPantry = (response.items || []).map((row) => pantryRowToItem(row));
      const nextPantry = cloudPantry.length > 0 ? cloudPantry : localPantry;
      lastSavedPantryRef.current = serializePantry(cloudPantry);
      setPantry(nextPantry);
      setPantryLoaded(true);
      setSyncStatus("saved");
      setSyncMessage(cloudPantry.length > 0 ? "Pantry synced" : "Local pantry ready");
    }

    loadUserPantry();

    return () => {
      isActive = false;
    };
  }, [authSession, user]);

  useEffect(() => {
    if (!user || !authSession || !pantryLoaded) {
      return;
    }

    const nextSavedPantry = serializePantry(pantry);
    saveLocalPantry(user.id, pantry);

    if (nextSavedPantry === lastSavedPantryRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSyncStatus("saving");
      setSyncMessage("Saving pantry");

      replaceSupabasePantry(authSession, pantry)
        .then(() => {
          lastSavedPantryRef.current = nextSavedPantry;
          setSyncStatus("saved");
          setSyncMessage("Pantry synced");
        })
        .catch((error: Error) => {
          setSyncStatus("error");
          setSyncMessage(pantrySyncErrorMessage(error));
        });
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [authSession, pantry, pantryLoaded, user]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeTab]);

  function changeTab(tab: TabId) {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }

    setActiveTab(tab);
    window.requestAnimationFrame(() => {
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    });
  }

  async function handleAuth(mode: AuthMode, email: string, password: string) {
    setAuthLoading(true);
    setAuthError("");
    setAuthNotice("");

    try {
      const data = await apiRequest<AuthApiResponse>(
        "/api/auth",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: mode,
            email,
            password,
            redirectTo: window.location.origin,
          }),
        },
        mode === "sign-up" ? "Could not create account." : "Could not sign in.",
      );

      if (data.session) {
        saveAuthSession(data.session);
        setAuthSession(data.session);
        setUser(data.session.user);
        setAuthNotice("Signed in.");
      } else if (mode === "sign-up") {
        setAuthNotice("Check your email to confirm your account, then sign in.");
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleResendConfirmation(email: string) {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setAuthError("Enter your email first.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");
    setAuthNotice("");

    try {
      await apiRequest<AuthApiResponse>(
        "/api/auth",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "resend-confirmation",
            email: trimmedEmail,
            redirectTo: window.location.origin,
          }),
        },
        "Could not resend the confirmation email.",
      );

      setAuthNotice("Sent a fresh confirmation email for this app URL.");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not resend confirmation.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    setAuthLoading(true);

    if (authSession) {
      await apiRequest<AuthApiResponse>(
        "/api/auth",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(authSession),
          },
          body: JSON.stringify({
            action: "sign-out",
          }),
        },
        "Could not sign out cleanly.",
      ).catch(() => undefined);
    }

    saveAuthSession(null);
    setAuthSession(null);
    setUser(null);
    setPantry([]);
    setPantryLoaded(false);
    setSyncStatus("idle");
    setSyncMessage("");
    lastSavedPantryRef.current = "";
    setAuthLoading(false);
  }

  function addStarterPantry() {
    setPantry(pantrySeed);
    changeTab("pantry");
  }

  function updateQuantity(id: string, delta: number) {
    setPantry((items) =>
      items.flatMap((item) => {
        if (item.id !== id) {
          return [item];
        }

        const quantity = Number((item.quantity + delta).toFixed(1));

        return quantity > 0 ? [{ ...item, quantity }] : [];
      }),
    );
  }

  function setQuantity(id: string, nextQuantity: number) {
    if (!Number.isFinite(nextQuantity)) {
      return;
    }

    const quantity = Number(nextQuantity.toFixed(2));

    setPantry((items) =>
      items.flatMap((item) => {
        if (item.id !== id) {
          return [item];
        }

        return quantity > 0 ? [{ ...item, quantity }] : [];
      }),
    );
  }

  function applyPantryActions(actions: PantryAction[]) {
    if (actions.length === 0) {
      return;
    }

    setPantry((items) => {
      const next = [...items];

      for (const action of actions) {
        if (action.type === "clear") {
          next.length = 0;
          continue;
        }

        const actionName = normalized(action.name);
        const existingIndex = next.findIndex((item) => normalized(item.name) === actionName);

        if (action.type === "remove") {
          if (existingIndex >= 0) {
            next.splice(existingIndex, 1);
          }

          continue;
        }

        if (existingIndex >= 0) {
          const existing = next[existingIndex];
          const category = action.category || existing.category;
          const quantity =
            action.type === "add"
              ? Number((existing.quantity + (action.quantity ?? 1)).toFixed(1))
              : action.quantity ?? existing.quantity;

          if (quantity <= 0) {
            next.splice(existingIndex, 1);
            continue;
          }

          next[existingIndex] = {
            ...existing,
            quantity,
            unit: action.unit || existing.unit,
            category,
            location: action.location || existing.location,
            expiresIn: action.expiresIn ?? existing.expiresIn,
            color: colorForCategory(category),
          };
        } else {
          const category = action.category || "Other";
          next.unshift({
            id: idFromName(action.name),
            name: action.name,
            category,
            quantity: action.quantity ?? 1,
            unit: action.unit || "item",
            expiresIn: action.expiresIn ?? 14,
            location: action.location || "Pantry",
            color: colorForCategory(category),
          });
        }
      }

      return next;
    });
  }

  async function handleReceiptUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const input = event.currentTarget;

    setScannedBarcode("");
    setReceiptName(file.name);
    setScanItems([]);
    setScanError("");
    setScanComplete(false);
    setReceiptAdded(false);

    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      const response = await fetch("/api/receipt-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl }),
      });
      const data = (await response.json()) as ReceiptScanResponse;

      if (!response.ok || !Array.isArray(data.items) || data.items.length === 0) {
        throw new Error(data.error || "No grocery items were found on this receipt.");
      }

      setReceiptName(data.storeName?.trim() || file.name);
      setScanItems(
        data.items
          .filter((item) => typeof item.name === "string" && item.name.trim())
          .map(createReceiptItem),
      );
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Could not read this receipt.");
    } finally {
      setScanComplete(true);
      input.value = "";
    }
  }

  function handleBarcodeDetected(detectedItem: DetectedBarcodeItem) {
    const barcode = detectedItem.barcode.trim();

    if (!barcode) {
      return;
    }

    setScannedBarcode(barcode);
    setScanError("");
    setReceiptName(detectedItem.productName?.trim() || `Barcode ${barcode}`);
    setScanItems([createBarcodeItem(detectedItem)]);
    setScanComplete(true);
    setReceiptAdded(false);
  }

  function removeScanItem(itemId: string) {
    setScanItems((items) => items.filter((item) => item.id !== itemId));
    setReceiptAdded(false);
  }

  function addReceiptItems() {
    if (receiptAdded || scanItems.length === 0) {
      return;
    }

    setPantry((items) => {
      const next = [...items];

      for (const scanItem of scanItems) {
        const existingIndex = next.findIndex(
          (item) => item.id === scanItem.id || normalized(item.name) === normalized(scanItem.name),
        );

        if (existingIndex >= 0) {
          const existing = next[existingIndex];
          next[existingIndex] = {
            ...existing,
            quantity: Number((existing.quantity + scanItem.quantity).toFixed(2)),
            expiresIn: Math.min(existing.expiresIn, scanItem.expiresIn),
          };
          continue;
        }

        next.unshift(scanItem);
      }

      return next;
    });
    setReceiptAdded(true);
    changeTab("pantry");
  }

  async function askAi(prompt: string) {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      return;
    }

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;

    setChatMessages((messages) => [
      ...messages,
      {
        id: userMessageId,
        role: "user",
        text: trimmedPrompt,
      },
      {
        id: assistantMessageId,
        role: "assistant",
        text: "Asking Gemini for pantry-first recipe ideas...",
        loading: true,
        source: "gemini",
      },
    ]);
    setChatInput("");
    changeTab("chat");

    const deterministicAction = createLocalActionMessage(
      trimmedPrompt,
      assistantMessageId,
      pantryNames,
    );

    if (deterministicAction.pantryActions?.some((action) => action.type === "clear")) {
      applyPantryActions(deterministicAction.pantryActions);
      setChatMessages((messages) =>
        messages.map((message) =>
          message.id === assistantMessageId
            ? {
                ...deterministicAction,
                text: "Cleared every item from your pantry.",
              }
            : message,
        ),
      );
      return;
    }

    try {
      const response = await fetch("/api/recipe-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          pantry: pantry.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            expiresIn: item.expiresIn,
            location: item.location,
          })),
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        text?: string;
        ready?: AiRecommendation[];
        stretch?: AiRecommendation[];
        pantryActions?: PantryAction[];
        shoppingList?: ShoppingSuggestion[];
        nutritionNotes?: string[];
      };

      if (!response.ok) {
        throw new Error(data.error || `Gemini request failed (${response.status}).`);
      }

      if (!data.text) {
        throw new Error("Gemini response did not include a reply");
      }
      const geminiText = data.text;
      const geminiReady = data.ready || [];
      const geminiStretch = data.stretch || [];
      const geminiPantryActions = data.pantryActions || [];
      const geminiShoppingList = data.shoppingList || [];
      const geminiNutritionNotes = data.nutritionNotes || [];

      applyPantryActions(geminiPantryActions);

      setChatMessages((messages) =>
        messages.map((message) =>
          message.id === assistantMessageId
            ? {
                id: assistantMessageId,
                role: "assistant",
                text: geminiText,
                ready: geminiReady,
                stretch: geminiStretch,
                pantryActions: geminiPantryActions,
                shoppingList: geminiShoppingList,
                nutritionNotes: geminiNutritionNotes,
                source: "gemini",
              }
            : message,
        ),
      );
    } catch (error) {
      const fallback = createLocalActionMessage(trimmedPrompt, assistantMessageId, pantryNames);
      const reason =
        error instanceof Error ? error.message : "Gemini could not complete the request.";

      applyPantryActions(fallback.pantryActions || []);

      setChatMessages((messages) =>
        messages.map((message) =>
          message.id === assistantMessageId
            ? {
                ...fallback,
                text:
                  fallback.pantryActions && fallback.pantryActions.length > 0
                    ? `I couldn't complete this with Gemini: ${reason} I handled the pantry change locally.`
                    : `I couldn't complete this with Gemini: ${reason} Here is a local pantry-first fallback with the same 3-plus-2 recipe mix.`,
              }
            : message,
        ),
      );
    }
  }

  function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    askAi(chatInput);
  }

  function startCooking(recipe: RecipeMatch) {
    setSelectedCookingRecipe(buildCookingRecipe(recipe));
    changeTab("recipes");
  }

  if (!authReady) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <AuthScreen
        error={authError}
        loading={authLoading}
        notice={authNotice}
        onResendConfirmation={handleResendConfirmation}
        onSubmit={handleAuth}
      />
    );
  }

  const syncLabel =
    syncStatus === "loading"
      ? "Loading pantry"
      : syncStatus === "saving"
        ? "Saving pantry"
        : syncStatus === "error"
          ? "Sync needs setup"
          : user.email || "Private pantry";

  return (
    <main className="min-h-dvh bg-[#dfe8e2] px-4 py-5 text-[#18211b] sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-6xl items-center justify-center">
        <section className="relative flex h-[min(900px,calc(100dvh-2.5rem))] w-full max-w-[430px] flex-col overflow-hidden rounded-[38px] border border-white/70 bg-[#f8faf6] shadow-2xl shadow-emerald-950/20 sm:h-[860px]">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-10 bg-[#f8faf6]/95">
            <div className="mx-auto mt-2 h-5 w-32 rounded-full bg-[#151916]" />
          </div>

          <div className="flex items-center justify-between px-5 pb-3 pt-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5d6b61]">
                {syncLabel}
              </p>
              <h1 className="text-3xl font-bold tracking-normal text-[#111713]">
                Cauldron
              </h1>
            </div>
            <button
              className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#263129] shadow-sm ring-1 ring-black/5"
              aria-label="Sign out"
              disabled={authLoading}
              onClick={handleSignOut}
            >
              <LogOut size={19} />
            </button>
          </div>

          <div
            ref={contentRef}
            data-testid="app-scroll"
            className="flex-1 overflow-y-auto px-5 pb-24"
          >
            {activeTab === "home" && (
              <HomeScreen
                pantryCount={pantry.length}
                expiringItems={expiringItems}
                recipeMatches={recipeMatches}
                onScan={() => changeTab("scan")}
                onRecipes={() => changeTab("recipes")}
              />
            )}

            {activeTab === "pantry" && (
              <PantryScreen
                items={filteredPantry}
                loading={syncStatus === "loading"}
                query={query}
                syncError={syncStatus === "error" ? syncMessage : ""}
                totalCount={pantry.length}
                onAddStarterPantry={addStarterPantry}
                onQueryChange={setQuery}
                onQuantityChange={updateQuantity}
                onQuantitySet={setQuantity}
              />
            )}

            {activeTab === "scan" && (
              <ScanScreen
                receiptName={receiptName}
                scanError={scanError}
                scanItems={scanItems}
                scanComplete={scanComplete}
                receiptAdded={receiptAdded}
                scannedBarcode={scannedBarcode}
                onUpload={handleReceiptUpload}
                onBarcodeDetected={handleBarcodeDetected}
                onRemoveScanItem={removeScanItem}
                onAddReceipt={addReceiptItems}
              />
            )}

            {activeTab === "chat" && (
              <ChatScreen
                input={chatInput}
                messages={chatMessages}
                pantryCount={pantry.length}
                onCookRecipe={startCooking}
                onInputChange={setChatInput}
                onSubmit={handleChatSubmit}
                onPromptSelect={askAi}
              />
            )}

            {activeTab === "recipes" && (
              <RecipeScreen
                recipeMatches={recipeMatches}
                selectedRecipe={selectedCookingRecipe}
                onCookRecipe={startCooking}
              />
            )}
          </div>

          <nav className="absolute inset-x-0 bottom-0 z-20 border-t border-black/5 bg-white/95 px-5 pb-5 pt-3 backdrop-blur">
            <div className="grid grid-cols-5 gap-1.5">
              {tabItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    className={`flex h-14 flex-col items-center justify-center gap-1 rounded-[20px] text-[11px] font-semibold transition ${
                      isActive
                        ? "bg-[#153d2a] text-white shadow-lg shadow-emerald-950/20"
                        : "text-[#657066]"
                    }`}
                    onClick={() => changeTab(item.id)}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </section>
      </div>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="min-h-dvh bg-[#dfe8e2] px-4 py-5 text-[#18211b] sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-6xl items-center justify-center">
        <section className="relative grid h-[min(900px,calc(100dvh-2.5rem))] w-full max-w-[430px] place-items-center overflow-hidden rounded-[38px] border border-white/70 bg-[#f8faf6] shadow-2xl shadow-emerald-950/20 sm:h-[860px]">
          <div className="text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#173b2a] text-white">
              <RefreshCw size={24} />
            </span>
            <p className="mt-4 text-sm font-bold text-[#5d6b61]">Loading Cauldron</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function AuthScreen({
  error,
  loading,
  notice,
  onResendConfirmation,
  onSubmit,
}: {
  error: string;
  loading: boolean;
  notice: string;
  onResendConfirmation: (email: string) => void;
  onSubmit: (mode: AuthMode, email: string, password: string) => void;
}) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isSignUp = mode === "sign-up";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(mode, email.trim(), password);
  }

  return (
    <main className="min-h-dvh bg-[#dfe8e2] px-4 py-5 text-[#18211b] sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-6xl items-center justify-center">
        <section className="relative flex h-[min(900px,calc(100dvh-2.5rem))] w-full max-w-[430px] flex-col overflow-hidden rounded-[38px] border border-white/70 bg-[#f8faf6] shadow-2xl shadow-emerald-950/20 sm:h-[860px]">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-10 bg-[#f8faf6]/95">
            <div className="mx-auto mt-2 h-5 w-32 rounded-full bg-[#151916]" />
          </div>

          <div className="flex flex-1 flex-col justify-between px-5 pb-7 pt-14">
            <div>
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#173b2a] text-white shadow-lg shadow-emerald-950/20">
                <ShieldCheck size={26} />
              </span>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#657066]">
                Private pantry
              </p>
              <h1 className="mt-2 text-4xl font-bold tracking-normal text-[#111713]">
                Cauldron
              </h1>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#657066]">
                Sign in to keep pantry logs synced to your account.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 rounded-2xl bg-[#eef3ef] p-1">
                <button
                  className={`h-11 rounded-[14px] text-sm font-bold ${
                    !isSignUp ? "bg-white text-[#173b2a] shadow-sm" : "text-[#657066]"
                  }`}
                  type="button"
                  onClick={() => setMode("sign-in")}
                >
                  Sign in
                </button>
                <button
                  className={`h-11 rounded-[14px] text-sm font-bold ${
                    isSignUp ? "bg-white text-[#173b2a] shadow-sm" : "text-[#657066]"
                  }`}
                  type="button"
                  onClick={() => setMode("sign-up")}
                >
                  Create
                </button>
              </div>

              <label className="block rounded-[22px] bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#657066]">
                  Email
                </span>
                <input
                  className="mt-2 w-full bg-transparent text-base font-semibold text-[#18211b] outline-none"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label className="block rounded-[22px] bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#657066]">
                  Password
                </span>
                <input
                  className="mt-2 w-full bg-transparent text-base font-semibold text-[#18211b] outline-none"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  required
                />
              </label>

              {error && (
                <p className="rounded-2xl bg-rose-100 px-4 py-3 text-sm font-bold text-rose-800">
                  {error}
                </p>
              )}
              {notice && (
                <p className="rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-bold text-emerald-800">
                  {notice}
                </p>
              )}

              <button
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#173b2a] text-sm font-bold text-white shadow-sm disabled:bg-[#9da9a0]"
                type="submit"
                disabled={loading}
              >
                {loading && <RefreshCw size={17} />}
                {isSignUp ? "Create account" : "Sign in"}
              </button>

              {isSignUp && (
                <button
                  className="flex h-12 w-full items-center justify-center rounded-2xl bg-white text-sm font-bold text-[#173b2a] shadow-sm ring-1 ring-black/5 disabled:text-[#9da9a0]"
                  type="button"
                  disabled={loading}
                  onClick={() => onResendConfirmation(email)}
                >
                  Resend confirmation email
                </button>
              )}
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function HomeScreen({
  pantryCount,
  expiringItems,
  recipeMatches,
  onScan,
  onRecipes,
}: {
  pantryCount: number;
  expiringItems: PantryItem[];
  recipeMatches: Array<Recipe & { available: string[]; missing: string[]; match: number }>;
  onScan: () => void;
  onRecipes: () => void;
}) {
  const bestRecipe = [...recipeMatches].sort((a, b) => b.match - a.match)[0];

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-[#173b2a] p-5 text-white shadow-xl shadow-emerald-950/15">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-100">Ready from your kitchen</p>
            <h2 className="mt-2 max-w-[14rem] text-2xl font-bold leading-tight tracking-normal">
              {bestRecipe.name}
            </h2>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
            <ChefHat size={28} />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Metric label="Pantry" value={String(pantryCount)} />
          <Metric label="Match" value={`${bestRecipe.match}%`} />
          <Metric label="Time" value={bestRecipe.time} />
        </div>
        <button
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-[#173b2a]"
          onClick={onRecipes}
        >
          <Sparkles size={18} />
          View recipes
        </button>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <button
          className="flex min-h-28 flex-col justify-between rounded-[24px] bg-white p-4 text-left shadow-sm ring-1 ring-black/5"
          onClick={onScan}
        >
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-100 text-sky-700">
            <Camera size={20} />
          </span>
          <span>
            <span className="block text-base font-bold">Scan receipt</span>
            <span className="mt-1 block text-xs font-medium text-[#6b756d]">
              Extract food items
            </span>
          </span>
        </button>
        <div className="flex min-h-28 flex-col justify-between rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-black/5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-100 text-rose-700">
            <CalendarClock size={20} />
          </span>
          <span>
            <span className="block text-base font-bold">{expiringItems.length} expiring</span>
            <span className="mt-1 block text-xs font-medium text-[#6b756d]">
              Next 5 days
            </span>
          </span>
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="Priority"
          title="Use these first"
          actionLabel="Alerts"
          icon={<Bell size={16} />}
        />
        <div className="mt-3 space-y-3">
          {expiringItems.slice(0, 4).map((item) => (
            <ExpiryItem key={item.id} item={item} compact />
          ))}
        </div>
      </section>
    </div>
  );
}

function PantryScreen({
  items,
  loading,
  query,
  syncError,
  totalCount,
  onAddStarterPantry,
  onQueryChange,
  onQuantityChange,
  onQuantitySet,
}: {
  items: PantryItem[];
  loading: boolean;
  query: string;
  syncError: string;
  totalCount: number;
  onAddStarterPantry: () => void;
  onQueryChange: (value: string) => void;
  onQuantityChange: (id: string, delta: number) => void;
  onQuantitySet: (id: string, quantity: number) => void;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
            <ShoppingBasket size={21} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#6c756d]">Digital pantry</p>
            <h2 className="text-2xl font-bold tracking-normal">{totalCount} ingredients</h2>
          </div>
        </div>
        <label className="mt-4 flex h-12 items-center gap-3 rounded-2xl bg-[#eef3ef] px-4 text-[#59645c]">
          <Search size={18} />
          <input
            className="w-full bg-transparent text-sm font-semibold text-[#1b221d] outline-none placeholder:text-[#758078]"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search ingredients"
          />
        </label>
        {syncError && (
          <p className="mt-3 rounded-2xl bg-rose-100 px-4 py-3 text-sm font-bold text-rose-800">
            {syncError}
          </p>
        )}
      </section>

      <section>
        <SectionTitle eyebrow="Inventory" title="Tracked ingredients" />
        <div className="mt-3 space-y-3">
          {loading && (
            <div className="rounded-[24px] bg-white p-4 text-sm font-bold text-[#657066] shadow-sm ring-1 ring-black/5">
              Loading pantry...
            </div>
          )}

          {!loading &&
            items.map((item) => (
              <IngredientRow
                key={item.id}
                item={item}
                onQuantityChange={onQuantityChange}
                onQuantitySet={onQuantitySet}
              />
            ))}

          {!loading && items.length === 0 && (
            <div className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-black/5">
              <p className="text-sm font-bold">
                {totalCount === 0 ? "No pantry items yet" : "No matching ingredients"}
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[#657066]">
                {totalCount === 0
                  ? "Scan groceries or ask Cauldron to add ingredients to this account."
                  : "Try a different search term."}
              </p>
              {totalCount === 0 && (
                <button
                  className="mt-4 flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#173b2a] px-4 text-sm font-bold text-white"
                  onClick={onAddStarterPantry}
                >
                  <Plus size={17} />
                  Add sample items
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ScanScreen({
  receiptName,
  scanError,
  scanItems,
  scanComplete,
  receiptAdded,
  scannedBarcode,
  onUpload,
  onBarcodeDetected,
  onRemoveScanItem,
  onAddReceipt,
}: {
  receiptName: string;
  scanError: string;
  scanItems: PantryItem[];
  scanComplete: boolean;
  receiptAdded: boolean;
  scannedBarcode: string;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onBarcodeDetected: (detectedItem: DetectedBarcodeItem) => void;
  onRemoveScanItem: (itemId: string) => void;
  onAddReceipt: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorShape | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<
    "idle" | "starting" | "scanning" | "reviewing" | "found" | "unsupported" | "blocked" | "error"
  >("idle");
  const isSearchingBarcode = scannerStatus === "reviewing";
  const confirmationItem = scannedBarcode ? scanItems[0] : undefined;
  const confirmationNutritionFacts = confirmationItem?.nutrition
    ? [
        confirmationItem.nutrition.calories === undefined
          ? undefined
          : { label: "Calories", value: `${formatNutritionNumber(confirmationItem.nutrition.calories)} kcal` },
        { label: "Protein", value: formatNutritionGrams(confirmationItem.nutrition.protein) },
        { label: "Carbs", value: formatNutritionGrams(confirmationItem.nutrition.carbs) },
        { label: "Fat", value: formatNutritionGrams(confirmationItem.nutrition.fat) },
      ].filter((fact): fact is { label: string; value: string } => Boolean(fact?.value))
    : [];

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    detectorRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function detectedBarcodeFromResponse(
    data: Partial<DetectedBarcodeItem>,
    fallbackBarcode: string,
  ): DetectedBarcodeItem {
    return {
      barcode: typeof data.barcode === "string" && data.barcode.trim() ? data.barcode : fallbackBarcode,
      productName: typeof data.productName === "string" ? data.productName : undefined,
      category: typeof data.category === "string" ? data.category : undefined,
      quantity: typeof data.quantity === "number" ? data.quantity : undefined,
      unit: typeof data.unit === "string" ? data.unit : undefined,
      expiresIn: typeof data.expiresIn === "number" ? data.expiresIn : undefined,
      brand: typeof data.brand === "string" ? data.brand : undefined,
      matchedBarcode: typeof data.matchedBarcode === "string" ? data.matchedBarcode : undefined,
      nutrition: data.nutrition,
      productImageUrl: typeof data.productImageUrl === "string" ? data.productImageUrl : undefined,
      lookupSource: data.lookupSource,
      lookupStatus: data.lookupStatus,
      lookupMessage: typeof data.lookupMessage === "string" ? data.lookupMessage : undefined,
    };
  }

  async function lookupBarcodeItem(detectedItem: DetectedBarcodeItem) {
    if (detectedItem.lookupStatus === "found") {
      return detectedItem;
    }

    const barcode = detectedItem.barcode.trim();

    if (!barcode) {
      return detectedItem;
    }

    try {
      const response = await fetch("/api/barcode-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode }),
      });
      const data = (await response.json()) as Partial<DetectedBarcodeItem> & {
        error?: string;
      };

      if (!response.ok || typeof data.barcode !== "string" || !data.barcode.trim()) {
        return detectedItem;
      }

      return detectedBarcodeFromResponse(data, barcode);
    } catch {
      return detectedItem;
    }
  }

  async function confirmBarcodeRead(detectedItem: DetectedBarcodeItem) {
    setScannerStatus("reviewing");
    const enrichedItem = await lookupBarcodeItem(detectedItem);
    onBarcodeDetected(enrichedItem);
    setScannerStatus("found");
    setConfirmationOpen(true);
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerStatus("unsupported");
      return;
    }

    try {
      setScannerStatus("starting");
      detectorRef.current = window.BarcodeDetector ? new window.BarcodeDetector() : null;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          height: { ideal: 720 },
          width: { ideal: 1280 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setScannerStatus("scanning");
    } catch (error) {
      stopCamera();
      setScannerStatus(error instanceof DOMException && error.name === "NotAllowedError" ? "blocked" : "error");
    }
  }

  async function extractCameraFrame() {
    const video = videoRef.current;

    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      setScannerStatus("error");
      return;
    }

    try {
      setScannerStatus("reviewing");
      const nativeBarcode = detectorRef.current
        ? await detectorRef.current
            .detect(video)
            .then((barcodes) => barcodes.find((result) => result.rawValue)?.rawValue || "")
            .catch(() => "")
        : "";

      if (nativeBarcode) {
        stopCamera();
        await confirmBarcodeRead({ barcode: nativeBarcode });
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");

      if (!context) {
        setScannerStatus("error");
        return;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const response = await fetch("/api/barcode-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: canvas.toDataURL("image/jpeg", 0.82) }),
      });
      const data = (await response.json()) as Partial<DetectedBarcodeItem> & {
        error?: string;
      };

      if (!response.ok || typeof data.barcode !== "string" || !data.barcode.trim()) {
        setScannerStatus("scanning");
        return;
      }

      stopCamera();
      await confirmBarcodeRead(detectedBarcodeFromResponse(data, data.barcode));
    } catch {
      setScannerStatus("error");
    }
  }

  function handleBarcodeOpen() {
    if (scannerStatus !== "starting" && scannerStatus !== "reviewing") {
      startCamera();
    }
  }

  const scannerStatusLabel = {
    idle: scanError
      ? "Try again"
      : !scanComplete
        ? "Reading receipt"
        : scanItems.length > 0
          ? "Read"
          : "Ready",
    starting: "Opening camera",
    scanning: "Camera ready",
    reviewing: "Searching",
    found: "Read",
    unsupported: "Camera unavailable",
    blocked: "Camera blocked",
    error: "Try again",
  }[scannerStatus];
  const showCameraPreview =
    scannerStatus === "starting" ||
    scannerStatus === "scanning" ||
    scannerStatus === "reviewing";

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] bg-[#111713] text-white shadow-xl shadow-black/10">
        <div className="relative min-h-64 p-5">
          <div className="absolute inset-0 opacity-80">
            <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,#2a8c67_0,transparent_30%),linear-gradient(135deg,#111713_0%,#28543f_100%)]" />
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-100">Receipt scanner</p>
                <h2 className="mt-1 text-2xl font-bold tracking-normal">
                  Add groceries in seconds
                </h2>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
                <ReceiptText size={24} />
              </span>
            </div>

            <div className="mt-6 rounded-[22px] bg-white p-4 text-[#1b211d] shadow-2xl shadow-black/20">
              <div className="flex items-start justify-between border-b border-dashed border-black/20 pb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#768078]">
                    {scannedBarcode ? "Barcode scan" : "Market receipt"}
                  </p>
                  <p className="mt-1 text-sm font-bold">{receiptName}</p>
                  {scannedBarcode && (
                    <p className="mt-1 text-xs font-semibold text-[#6c756d]">
                      {scannedBarcode}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    scanError ||
                    scannerStatus === "blocked" ||
                    scannerStatus === "error" ||
                    scannerStatus === "unsupported"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {scannerStatusLabel}
                </span>
              </div>
              {showCameraPreview && (
                <div className="mt-3 overflow-hidden rounded-[18px] bg-[#111713]">
                  <video
                    ref={videoRef}
                    className="aspect-video w-full object-cover"
                    muted
                    playsInline
                  />
                  {scannerStatus === "scanning" && (
                    <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-[#18211b] p-3">
                      <p className="text-xs font-bold text-emerald-50">
                        Place the barcode inside the camera view.
                      </p>
                      <button
                        className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-[#173b2a] shadow-sm"
                        type="button"
                        onClick={extractCameraFrame}
                      >
                        <ScanLine size={16} />
                        Extract
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="mt-3 space-y-2">
                {scanError && (
                  <p className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800">
                    {scanError}
                  </p>
                )}
                {!scanError && !scanComplete && (
                  <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                    Reading grocery items from this receipt...
                  </p>
                )}
                {scanItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{item.name}</span>
                    <span className="text-[#6c746e]">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold shadow-sm ring-1 ring-black/5">
          <Camera size={18} />
          Upload
          <input
            className="sr-only"
            type="file"
            accept="image/*"
            onChange={(event) => {
              stopCamera();
              setConfirmationOpen(false);
              setScannerStatus("idle");
              onUpload(event);
            }}
          />
        </label>
        <button
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#173b2a] text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-[#9da9a0]"
          disabled={
            scannerStatus === "starting" ||
            scannerStatus === "scanning" ||
            scannerStatus === "reviewing"
          }
          onClick={handleBarcodeOpen}
        >
          <ScanLine size={18} />
          Barcode
        </button>
      </section>

      {isSearchingBarcode && (
        <div
          aria-live="polite"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 py-5 backdrop-blur-[2px] sm:items-center"
          role="status"
        >
          <div className="w-full max-w-[320px] rounded-[28px] bg-[#f8faf6] p-5 text-center text-[#18211b] shadow-2xl shadow-black/25">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#173b2a] text-white">
              <RefreshCw className="animate-spin" size={22} />
            </span>
            <h3 className="mt-4 text-xl font-bold tracking-normal">Searching</h3>
            <p className="mt-2 text-sm font-semibold leading-5 text-[#657066]">
              Checking Open Food Facts for this barcode.
            </p>
          </div>
        </div>
      )}

      <section>
        <SectionTitle eyebrow="Detected" title="Ready to add" />
        <div className="mt-3 space-y-3">
          {scanError && (
            <div className="rounded-[22px] bg-white p-4 text-sm font-bold text-rose-800 shadow-sm ring-1 ring-black/5">
              {scanError}
            </div>
          )}
          {!scanError && !scanComplete && (
            <div className="rounded-[22px] bg-white p-4 text-sm font-bold text-[#657066] shadow-sm ring-1 ring-black/5">
              Reading receipt...
            </div>
          )}
          {!scanError && scanComplete && scanItems.length === 0 && (
            <div className="rounded-[22px] bg-white p-4 text-sm font-bold text-[#657066] shadow-sm ring-1 ring-black/5">
              Upload a receipt or scan a barcode to extract items.
            </div>
          )}
          {scanItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-black/5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-2xl ${item.color}`}>
                  <Leaf size={18} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{item.name}</p>
                  <p className="text-xs font-semibold text-[#6c756d]">
                    Expires in {item.expiresIn} days
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <p className="text-sm font-bold">
                  {item.quantity} {item.unit}
                </p>
                <button
                  aria-label={`Remove ${item.name}`}
                  className="grid h-9 w-9 place-items-center rounded-full bg-[#eef3ef] text-[#415047] ring-1 ring-black/5 transition hover:bg-rose-50 hover:text-rose-700"
                  title={`Remove ${item.name}`}
                  type="button"
                  onClick={() => onRemoveScanItem(item.id)}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          className={`mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold shadow-sm ${
            receiptAdded
              ? "bg-emerald-100 text-emerald-800"
              : "bg-[#173b2a] text-white"
          }`}
          disabled={receiptAdded || scanItems.length === 0}
          onClick={onAddReceipt}
        >
          {receiptAdded ? <Check size={18} /> : <Plus size={18} />}
          {receiptAdded ? "Added to pantry" : "Add all to pantry"}
        </button>
      </section>

      {confirmationOpen && confirmationItem && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 py-5 backdrop-blur-[2px] sm:items-center"
          role="dialog"
        >
          <div className="w-full max-w-[390px] rounded-[28px] bg-[#f8faf6] p-5 text-[#18211b] shadow-2xl shadow-black/25">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#657066]">
                  Barcode read
                </p>
                <h3 className="mt-1 text-xl font-bold tracking-normal">
                  {confirmationItem.name}
                </h3>
              </div>
              <button
                aria-label="Close barcode confirmation"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#263129] shadow-sm ring-1 ring-black/5"
                onClick={() => setConfirmationOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-black/5">
              <div className="flex items-center gap-3">
                <span
                  className={`grid h-12 w-12 place-items-center overflow-hidden rounded-2xl ${
                    confirmationItem.productImageUrl
                      ? "bg-white bg-contain bg-center bg-no-repeat ring-1 ring-black/5"
                      : confirmationItem.color
                  }`}
                  style={
                    confirmationItem.productImageUrl
                      ? { backgroundImage: `url("${confirmationItem.productImageUrl}")` }
                      : undefined
                  }
                >
                  {!confirmationItem.productImageUrl && <PackageOpen size={20} />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {confirmationItem.brand || confirmationItem.category}
                  </p>
                  <p className="mt-1 truncate text-xs font-semibold text-[#6c756d]">
                    {confirmationItem.brand
                      ? `${confirmationItem.category} - ${scannedBarcode}`
                      : scannedBarcode}
                  </p>
                  <p
                    className={`mt-1 text-xs font-bold ${
                      confirmationItem.lookupStatus === "found"
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }`}
                  >
                    {confirmationItem.lookupStatus === "found"
                      ? confirmationItem.matchedBarcode &&
                        confirmationItem.matchedBarcode !== scannedBarcode
                        ? `Matched product database as ${confirmationItem.matchedBarcode}`
                        : "Matched product database"
                      : confirmationItem.lookupMessage || "Product not found in database"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#eef3ef] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6c756d]">
                    Quantity
                  </p>
                  <p className="mt-1 text-sm font-bold">
                    {confirmationItem.quantity} {confirmationItem.unit}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#eef3ef] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6c756d]">
                    Expires
                  </p>
                  <p className="mt-1 text-sm font-bold">
                    {confirmationItem.expiresIn} days
                  </p>
                </div>
              </div>

              {confirmationItem.nutrition &&
                (confirmationNutritionFacts.length > 0 || confirmationItem.nutrition.nutriScore) && (
                  <div className="mt-3 rounded-2xl bg-[#eef3ef] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6c756d]">
                        {confirmationItem.nutrition.basis || "Nutrition"}
                      </p>
                      {confirmationItem.nutrition.nutriScore && (
                        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-[#173b2a]">
                          Nutri-Score {confirmationItem.nutrition.nutriScore}
                        </span>
                      )}
                    </div>
                    {confirmationItem.nutrition.servingSize && (
                      <p className="mt-1 text-xs font-semibold text-[#6c756d]">
                        Serving {confirmationItem.nutrition.servingSize}
                      </p>
                    )}
                    {confirmationNutritionFacts.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {confirmationNutritionFacts.map((fact) => (
                          <div key={fact.label} className="rounded-xl bg-white px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6c756d]">
                              {fact.label}
                            </p>
                            <p className="mt-1 text-sm font-bold">{fact.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
            </div>

            <div className="mt-4 grid grid-cols-[0.9fr_1.1fr] gap-3">
              <button
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-[#263129] shadow-sm ring-1 ring-black/5"
                onClick={() => setConfirmationOpen(false)}
              >
                <ScanLine size={17} />
                Review
              </button>
              <button
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#173b2a] text-sm font-bold text-white shadow-sm"
                onClick={() => {
                  setConfirmationOpen(false);
                  onAddReceipt();
                }}
              >
                <Plus size={17} />
                Add item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatScreen({
  input,
  messages,
  pantryCount,
  onCookRecipe,
  onInputChange,
  onSubmit,
  onPromptSelect,
}: {
  input: string;
  messages: ChatMessage[];
  pantryCount: number;
  onCookRecipe: (recipe: RecipeMatch) => void;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPromptSelect: (prompt: string) => void;
}) {
  const quickPrompts = [
    "Add 2 bananas",
    "Remove all items",
    "High protein shopping ideas",
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-[#173b2a] p-5 text-white shadow-xl shadow-emerald-950/15">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-100">AI recipe chat</p>
            <h2 className="mt-1 text-2xl font-bold leading-tight tracking-normal">
              Ask Cauldron
            </h2>
            <p className="mt-2 text-sm font-medium text-emerald-50/90">
              I can update pantry items, plan recipes from {pantryCount} ingredients,
              and suggest targeted groceries.
            </p>
          </div>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15">
            <Bot size={25} />
          </span>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#173b2a] shadow-sm ring-1 ring-black/5"
              onClick={() => onPromptSelect(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>

        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} onCookRecipe={onCookRecipe} />
        ))}
      </section>

      <form
        className="sticky bottom-0 rounded-[24px] bg-[#f8faf6] pb-2 pt-1"
        onSubmit={onSubmit}
      >
        <label className="flex min-h-14 items-center gap-3 rounded-[22px] bg-white px-4 shadow-sm ring-1 ring-black/5">
          <Sparkles size={18} className="shrink-0 text-[#173b2a]" />
          <input
            aria-label="Ask Cauldron AI"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#1b221d] outline-none placeholder:text-[#758078]"
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="Ask me anything"
          />
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#173b2a] text-white disabled:bg-[#b8c3bb]"
            type="submit"
            disabled={!input.trim()}
          >
            <Send size={17} />
            <span className="sr-only">Send recipe request</span>
          </button>
        </label>
      </form>
    </div>
  );
}

function ChatBubble({
  message,
  onCookRecipe,
}: {
  message: ChatMessage;
  onCookRecipe: (recipe: RecipeMatch) => void;
}) {
  const isUser = message.role === "user";

  return (
    <article
      className={`rounded-[24px] p-4 shadow-sm ring-1 ring-black/5 ${
        isUser ? "ml-10 bg-[#173b2a] text-white" : "bg-white text-[#18211b]"
      }`}
    >
      <div className="flex items-start gap-3">
        {!isUser && (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
            <Bot size={18} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {!isUser && message.source && (
            <span
              className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                message.source === "gemini"
                  ? "bg-sky-100 text-sky-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {message.source === "gemini" ? "Gemini" : "Local fallback"}
            </span>
          )}
          <p className={`text-sm font-semibold leading-6 ${isUser ? "text-white" : ""}`}>
            {message.text}
          </p>

          {!isUser && message.loading && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <span className="h-2 rounded-full bg-emerald-100" />
              <span className="h-2 rounded-full bg-emerald-100" />
              <span className="h-2 rounded-full bg-emerald-100" />
            </div>
          )}

          {!isUser && !message.loading && (
            <div className="mt-4 space-y-4">
              {message.pantryActions && message.pantryActions.length > 0 && (
                <ChatActionGroup actions={message.pantryActions} />
              )}
              {message.shoppingList && message.shoppingList.length > 0 && (
                <ShoppingSuggestionGroup items={message.shoppingList} />
              )}
              {message.nutritionNotes && message.nutritionNotes.length > 0 && (
                <NutritionNoteGroup notes={message.nutritionNotes} />
              )}
              {message.ready && message.ready.length > 0 && (
                <ChatRecipeGroup
                  label="Make now"
                  recipes={message.ready}
                  tone="green"
                  onCookRecipe={onCookRecipe}
                />
              )}
              {message.stretch && message.stretch.length > 0 && (
                <ChatRecipeGroup
                  label="Need 1-2 items"
                  recipes={message.stretch}
                  tone="amber"
                  onCookRecipe={onCookRecipe}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function ChatActionGroup({ actions }: { actions: PantryAction[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6d776f]">
          Pantry updates
        </p>
        <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-bold text-sky-800">
          Applied
        </span>
      </div>
      <div className="space-y-2">
        {actions.map((action) => (
          <div key={`${action.type}-${action.name}`} className="rounded-[18px] bg-[#f4f7f4] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold capitalize">
                  {action.type} {action.name}
                </p>
                {action.reason && (
                  <p className="mt-1 text-xs font-semibold text-[#657066]">
                    {action.reason}
                  </p>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#546057]">
                {action.quantity ? `${action.quantity} ${action.unit || ""}` : action.type}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShoppingSuggestionGroup({ items }: { items: ShoppingSuggestion[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6d776f]">
          Shopping ideas
        </p>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
          Goal based
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.name} className="rounded-[18px] bg-[#f4f7f4] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold">{item.name}</p>
                <p className="mt-1 text-xs font-semibold text-[#657066]">{item.reason}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#546057]">
                {item.priority}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NutritionNoteGroup({ notes }: { notes: string[] }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6d776f]">
        Nutrition notes
      </p>
      <div className="space-y-2">
        {notes.map((note) => (
          <p
            key={note}
            className="rounded-[18px] bg-emerald-50 px-3 py-2 text-xs font-semibold leading-5 text-emerald-900"
          >
            {note}
          </p>
        ))}
      </div>
    </div>
  );
}

function ChatRecipeGroup({
  label,
  recipes,
  tone,
  onCookRecipe,
}: {
  label: string;
  recipes: AiRecommendation[];
  tone: "green" | "amber";
  onCookRecipe: (recipe: RecipeMatch) => void;
}) {
  const labelClass =
    tone === "green" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6d776f]">
          {label}
        </p>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${labelClass}`}>
          {recipes.length} recipes
        </span>
      </div>
      <div className="space-y-2">
        {recipes.map((recipe) => (
          <ChatRecipeCard
            key={recipe.id}
            recipe={recipe}
            tone={tone}
            onCookRecipe={onCookRecipe}
          />
        ))}
      </div>
    </div>
  );
}

function ChatRecipeCard({
  recipe,
  tone,
  onCookRecipe,
}: {
  recipe: AiRecommendation;
  tone: "green" | "amber";
  onCookRecipe: (recipe: RecipeMatch) => void;
}) {
  const badgeClass =
    tone === "green" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800";
  const missingText =
    recipe.missing.length > 0
      ? recipe.missing.map(formatIngredient).join(", ")
      : "Nothing else";

  return (
    <div className="rounded-[18px] bg-[#f4f7f4] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold leading-snug">{recipe.name}</h3>
          <p className="mt-1 text-xs font-semibold text-[#657066]">{recipe.highlight}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${badgeClass}`}>
            {recipe.match}%
          </span>
          <button
            className="flex h-8 items-center gap-1.5 rounded-full bg-[#173b2a] px-3 text-[11px] font-bold text-white shadow-sm"
            type="button"
            onClick={() => onCookRecipe(recipe)}
          >
            <ChefHat size={14} />
            Cook
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
        <span className="rounded-full bg-white px-2.5 py-1 text-[#546057]">
          {recipe.time}
        </span>
        <span className="rounded-full bg-white px-2.5 py-1 text-[#546057]">
          {recipe.style}
        </span>
        <span className={`rounded-full px-2.5 py-1 ${badgeClass}`}>
          Need: {missingText}
        </span>
      </div>
    </div>
  );
}

function RecipeScreen({
  recipeMatches,
  selectedRecipe,
  onCookRecipe,
}: {
  recipeMatches: RecipeMatch[];
  selectedRecipe: CookingRecipe | null;
  onCookRecipe: (recipe: RecipeMatch) => void;
}) {
  return (
    <div className="space-y-5">
      {selectedRecipe ? (
        <CookRecipePanel recipe={selectedRecipe} />
      ) : (
        <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-100 text-rose-700">
              <Flame size={21} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#6c756d]">Cook from pantry</p>
              <h2 className="text-2xl font-bold tracking-normal">Smart recipes</h2>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Metric label="Ready" value="3" light />
            <Metric label="1 item" value="2" light />
            <Metric label="2 items" value="2" light />
          </div>
        </section>
      )}

      <section>
        <SectionTitle
          eyebrow={selectedRecipe ? "Suggested" : "Suggested"}
          title={selectedRecipe ? "More matches" : "Best matches"}
        />
        <div className="mt-3 space-y-3">
          {recipeMatches.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onCookRecipe={onCookRecipe} />
          ))}
        </div>
      </section>
    </div>
  );
}

function CookRecipePanel({ recipe }: { recipe: CookingRecipe }) {
  return (
    <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6a756e]">
            Cooking now
          </p>
          <h2 className="mt-2 text-2xl font-bold leading-tight tracking-normal">
            {recipe.name}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-5 text-[#657066]">
            {recipe.highlight}
          </p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#173b2a] text-white">
          <ChefHat size={22} />
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric label="Time" value={recipe.time} light />
        <Metric label="Match" value={`${recipe.match}%`} light />
        <Metric label="Need" value={String(recipe.missing.length)} light />
      </div>

      <div className="mt-5 space-y-4">
        <TagRow label="Use" values={recipe.ingredients} tone="green" />
        {recipe.missing.length > 0 && (
          <TagRow label="Pick up" values={recipe.missing} tone="amber" />
        )}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6d776f]">
            Prep
          </p>
          <div className="space-y-2">
            {recipe.prepNotes.map((note) => (
              <p
                key={note}
                className="rounded-[18px] bg-[#f4f7f4] px-3 py-2 text-xs font-semibold leading-5 text-[#4f5b53]"
              >
                {note}
              </p>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6d776f]">
            Instructions
          </p>
          <div className="space-y-2">
            {recipe.instructions.map((instruction, index) => (
              <div
                key={instruction}
                className="flex gap-3 rounded-[18px] bg-[#f4f7f4] p-3"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-[#173b2a]">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold leading-5 text-[#2d3931]">
                  {instruction}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RecipeCard({
  recipe,
  onCookRecipe,
}: {
  recipe: RecipeMatch;
  onCookRecipe: (recipe: RecipeMatch) => void;
}) {
  return (
    <article className="rounded-[26px] bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#ecf4ee] px-3 py-1 text-xs font-bold text-[#27573d]">
              {recipe.match}% match
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              {recipe.missing.length} extra
            </span>
          </div>
          <h3 className="mt-3 text-lg font-bold leading-snug tracking-normal">{recipe.name}</h3>
          <p className="mt-1 text-sm font-semibold text-[#6b756d]">{recipe.highlight}</p>
        </div>
        <button
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#173b2a] text-white"
          type="button"
          onClick={() => onCookRecipe(recipe)}
        >
          <ChevronRight size={19} />
          <span className="sr-only">Cook {recipe.name}</span>
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3 text-xs font-bold text-[#5e6961]">
        <span className="flex items-center gap-1.5">
          <Clock3 size={15} />
          {recipe.time}
        </span>
        <span className="flex items-center gap-1.5">
          <Utensils size={15} />
          {recipe.style}
        </span>
        <span>{recipe.energy}</span>
      </div>

      <div className="mt-4 space-y-3">
        <TagRow label="Have" values={recipe.available} tone="green" />
        <TagRow label="Need" values={recipe.missing} tone="amber" />
      </div>
    </article>
  );
}

function IngredientRow({
  item,
  onQuantityChange,
  onQuantitySet,
}: {
  item: PantryItem;
  onQuantityChange: (id: string, delta: number) => void;
  onQuantitySet: (id: string, quantity: number) => void;
}) {
  const [quantityDraft, setQuantityDraft] = useState({
    itemId: item.id,
    quantity: item.quantity,
    value: String(item.quantity),
  });
  const quantityValue =
    quantityDraft.itemId === item.id && quantityDraft.quantity === item.quantity
      ? quantityDraft.value
      : String(item.quantity);

  function commitQuantityDraft() {
    const trimmedQuantity = quantityValue.trim();
    const quantity = Number(trimmedQuantity);

    if (!trimmedQuantity || !Number.isFinite(quantity)) {
      setQuantityDraft({
        itemId: item.id,
        quantity: item.quantity,
        value: String(item.quantity),
      });
      return;
    }

    onQuantitySet(item.id, quantity);
  }

  function updateQuantityDraft(value: string) {
    setQuantityDraft({
      itemId: item.id,
      quantity: item.quantity,
      value,
    });
  }

  return (
    <article className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${item.color}`}>
            <Leaf size={19} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold">{item.name}</h3>
            <p className="text-xs font-semibold text-[#6c756d]">
              {item.location} - {item.category}
            </p>
          </div>
        </div>
        <ExpiryBadge days={item.expiresIn} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <label className="flex min-w-0 items-center gap-2 rounded-2xl bg-[#eef3ef] px-3 py-2">
          <span className="sr-only">Quantity for {item.name}</span>
          <input
            className="w-20 bg-transparent text-sm font-bold text-[#1b221d] outline-none"
            inputMode="decimal"
            min="0"
            step="any"
            type="number"
            value={quantityValue}
            onBlur={commitQuantityDraft}
            onChange={(event) => updateQuantityDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }

              if (event.key === "Escape") {
                updateQuantityDraft(String(item.quantity));
                event.currentTarget.blur();
              }
            }}
          />
          <span className="truncate text-sm font-bold text-[#6c756d]">{item.unit}</span>
        </label>
        <div className="flex items-center gap-2">
          <button
            className="grid h-9 w-9 place-items-center rounded-full bg-[#eef3ef] text-[#263129]"
            onClick={() => onQuantityChange(item.id, -1)}
          >
            <Minus size={16} />
            <span className="sr-only">Decrease {item.name}</span>
          </button>
          <button
            className="grid h-9 w-9 place-items-center rounded-full bg-[#173b2a] text-white"
            onClick={() => onQuantityChange(item.id, 1)}
          >
            <Plus size={16} />
            <span className="sr-only">Increase {item.name}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function ExpiryItem({ item, compact = false }: { item: PantryItem; compact?: boolean }) {
  const urgency =
    item.expiresIn <= 1
      ? "bg-rose-100 text-rose-800"
      : item.expiresIn <= 3
        ? "bg-amber-100 text-amber-800"
        : "bg-emerald-100 text-emerald-800";

  return (
    <article className="rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`grid h-10 w-10 place-items-center rounded-2xl ${item.color}`}>
            <Leaf size={18} />
          </span>
          <div>
            <h3 className="text-sm font-bold">{item.name}</h3>
            <p className="text-xs font-semibold text-[#6c756d]">
              {item.quantity} {item.unit} in {item.location}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${urgency}`}>
          {item.expiresIn === 1 ? "Tomorrow" : `${item.expiresIn} days`}
        </span>
      </div>
      {!compact && (
        <div className="mt-4 h-2 rounded-full bg-[#edf1ee]">
          <div
            className="h-full rounded-full bg-[#173b2a]"
            style={{ width: `${Math.max(12, 100 - item.expiresIn * 14)}%` }}
          />
        </div>
      )}
    </article>
  );
}

function ExpiryBadge({ days }: { days: number }) {
  if (days <= 5) {
    return (
      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
        {days <= 1 ? "1 day" : `${days} days`}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-[#eef3ef] px-3 py-1 text-xs font-bold text-[#68736b]">
      {days} days
    </span>
  );
}

function Metric({
  label,
  value,
  light = false,
}: {
  label: string;
  value: string;
  light?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl px-3 py-2 ${
        light ? "bg-[#f0f4f1] text-[#18211b]" : "bg-white/12 text-white"
      }`}
    >
      <p className={`text-[11px] font-semibold ${light ? "text-[#6d776f]" : "text-emerald-100"}`}>
        {label}
      </p>
      <p className="mt-1 text-base font-bold">{value}</p>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  actionLabel,
  icon,
}: {
  eyebrow: string;
  title: string;
  actionLabel?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6a756e]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-normal text-[#111713]">{title}</h2>
      </div>
      {actionLabel && (
        <button className="flex h-9 items-center gap-2 rounded-full bg-white px-3 text-xs font-bold text-[#173b2a] shadow-sm ring-1 ring-black/5">
          {icon}
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function TagRow({
  label,
  values,
  tone,
}: {
  label: string;
  values: string[];
  tone: "green" | "amber";
}) {
  const toneClass =
    tone === "green" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800";

  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6d776f]">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span key={value} className={`rounded-full px-3 py-1 text-xs font-bold ${toneClass}`}>
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}
