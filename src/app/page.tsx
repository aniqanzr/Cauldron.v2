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
  MessageCircle,
  Minus,
  PackageOpen,
  Plus,
  ReceiptText,
  ScanLine,
  Search,
  Send,
  ShoppingBasket,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type PantryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiresIn: number;
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

type AiRecommendation = Recipe & {
  available: string[];
  missing: string[];
  match: number;
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
};

type TabId = "home" | "pantry" | "scan" | "chat" | "recipes";

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

const receiptItems: PantryItem[] = [
  {
    id: "oat-milk",
    name: "Oat milk",
    category: "Dairy",
    quantity: 1,
    unit: "carton",
    expiresIn: 12,
    location: "Fridge",
    color: "bg-teal-100 text-teal-800",
  },
  {
    id: "brown-mushrooms",
    name: "Brown mushrooms",
    category: "Produce",
    quantity: 250,
    unit: "g",
    expiresIn: 5,
    location: "Crisper",
    color: "bg-stone-200 text-stone-800",
  },
  {
    id: "sourdough",
    name: "Sourdough",
    category: "Bakery",
    quantity: 1,
    unit: "loaf",
    expiresIn: 4,
    location: "Counter",
    color: "bg-orange-100 text-orange-800",
  },
  {
    id: "avocado",
    name: "Avocado",
    category: "Produce",
    quantity: 2,
    unit: "count",
    expiresIn: 3,
    location: "Counter",
    color: "bg-green-100 text-green-800",
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
  };
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
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [pantry, setPantry] = useState<PantryItem[]>(pantrySeed);
  const [query, setQuery] = useState("");
  const [chatInput, setChatInput] = useState("Use eggs, spinach, and rice");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    createAssistantMessage(
      "Use eggs, spinach, and rice",
      new Set(pantrySeed.map((item) => normalized(item.name))),
      "assistant-initial",
    ),
  ]);
  const [receiptName, setReceiptName] = useState("Woolworths receipt.jpg");
  const [scanItems, setScanItems] = useState<PantryItem[]>(receiptItems);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [scanComplete, setScanComplete] = useState(true);
  const [receiptAdded, setReceiptAdded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

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

  function handleReceiptUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setScannedBarcode("");
    setScanItems(receiptItems);
    setReceiptName(file.name);
    setScanComplete(false);
    setReceiptAdded(false);
    window.setTimeout(() => setScanComplete(true), 500);
  }

  function handleBarcodeDetected(detectedItem: DetectedBarcodeItem) {
    const barcode = detectedItem.barcode.trim();

    if (!barcode) {
      return;
    }

    setScannedBarcode(barcode);
    setReceiptName(detectedItem.productName?.trim() || `Barcode ${barcode}`);
    setScanItems([createBarcodeItem(detectedItem)]);
    setScanComplete(true);
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

      if (!response.ok) {
        throw new Error("Gemini request failed");
      }

      const data = (await response.json()) as {
        text?: string;
        ready?: AiRecommendation[];
        stretch?: AiRecommendation[];
        pantryActions?: PantryAction[];
        shoppingList?: ShoppingSuggestion[];
        nutritionNotes?: string[];
      };

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
    } catch {
      const fallback = createLocalActionMessage(trimmedPrompt, assistantMessageId, pantryNames);

      applyPantryActions(fallback.pantryActions || []);

      setChatMessages((messages) =>
        messages.map((message) =>
          message.id === assistantMessageId
            ? {
                ...fallback,
                text:
                  fallback.pantryActions && fallback.pantryActions.length > 0
                    ? fallback.text
                    : "Gemini is not configured or reachable yet, so here is a local pantry-first fallback with the same 3-plus-2 recipe mix.",
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
                Tuesday, Jun 2
              </p>
              <h1 className="text-3xl font-bold tracking-normal text-[#111713]">
                Cauldron
              </h1>
            </div>
            <button
              className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#263129] shadow-sm ring-1 ring-black/5"
              aria-label="Open expiry alerts"
              onClick={() => changeTab("home")}
            >
              <Bell size={20} />
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
                query={query}
                totalCount={pantry.length}
                onQueryChange={setQuery}
                onQuantityChange={updateQuantity}
                onQuantitySet={setQuantity}
              />
            )}

            {activeTab === "scan" && (
              <ScanScreen
                receiptName={receiptName}
                scanItems={scanItems}
                scanComplete={scanComplete}
                receiptAdded={receiptAdded}
                scannedBarcode={scannedBarcode}
                onUpload={handleReceiptUpload}
                onBarcodeDetected={handleBarcodeDetected}
                onAddReceipt={addReceiptItems}
              />
            )}

            {activeTab === "chat" && (
              <ChatScreen
                input={chatInput}
                messages={chatMessages}
                pantryCount={pantry.length}
                onInputChange={setChatInput}
                onSubmit={handleChatSubmit}
                onPromptSelect={askAi}
              />
            )}

            {activeTab === "recipes" && <RecipeScreen recipeMatches={recipeMatches} />}
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
  query,
  totalCount,
  onQueryChange,
  onQuantityChange,
  onQuantitySet,
}: {
  items: PantryItem[];
  query: string;
  totalCount: number;
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
      </section>

      <section>
        <SectionTitle eyebrow="Inventory" title="Tracked ingredients" />
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <IngredientRow
              key={item.id}
              item={item}
              onQuantityChange={onQuantityChange}
              onQuantitySet={onQuantitySet}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ScanScreen({
  receiptName,
  scanItems,
  scanComplete,
  receiptAdded,
  scannedBarcode,
  onUpload,
  onBarcodeDetected,
  onAddReceipt,
}: {
  receiptName: string;
  scanItems: PantryItem[];
  scanComplete: boolean;
  receiptAdded: boolean;
  scannedBarcode: string;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onBarcodeDetected: (detectedItem: DetectedBarcodeItem) => void;
  onAddReceipt: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorShape | null>(null);
  const lastDetectedRef = useRef("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<
    "idle" | "starting" | "scanning" | "reviewing" | "found" | "unsupported" | "blocked" | "error"
  >("idle");
  const confirmationItem = scannedBarcode ? scanItems[0] : undefined;

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function stopCamera() {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function confirmBarcodeRead(detectedItem: DetectedBarcodeItem) {
    onBarcodeDetected(detectedItem);
    setConfirmationOpen(true);
  }

  async function scanFrame() {
    const video = videoRef.current;
    const detector = detectorRef.current;

    if (!video || !detector || !streamRef.current) {
      return;
    }

    try {
      if (video.readyState >= 2) {
        const barcodes = await detector.detect(video);
        const barcode = barcodes.find((result) => result.rawValue)?.rawValue;

        if (barcode && barcode !== lastDetectedRef.current) {
          lastDetectedRef.current = barcode;
          stopCamera();
          setScannerStatus("found");
          confirmBarcodeRead({ barcode });
          return;
        }
      }

      animationFrameRef.current = window.requestAnimationFrame(scanFrame);
    } catch {
      stopCamera();
      setScannerStatus("error");
    }
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerStatus("unsupported");
      return;
    }

    try {
      setScannerStatus("starting");
      lastDetectedRef.current = "";
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

      if (detectorRef.current) {
        animationFrameRef.current = window.requestAnimationFrame(scanFrame);
      }
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
        setScannerStatus("error");
        return;
      }

      stopCamera();
      setScannerStatus("found");
      confirmBarcodeRead({
        barcode: data.barcode,
        productName: typeof data.productName === "string" ? data.productName : undefined,
        category: typeof data.category === "string" ? data.category : undefined,
        quantity: typeof data.quantity === "number" ? data.quantity : undefined,
        unit: typeof data.unit === "string" ? data.unit : undefined,
        expiresIn: typeof data.expiresIn === "number" ? data.expiresIn : undefined,
      });
    } catch {
      setScannerStatus("error");
    }
  }

  function handleExtract() {
    if (scannerStatus === "scanning") {
      extractCameraFrame();
      return;
    }

    if (scannerStatus !== "starting" && scannerStatus !== "reviewing") {
      startCamera();
    }
  }

  const scannerStatusLabel = {
    idle: scanComplete ? "Read" : "Ready",
    starting: "Opening camera",
    scanning: "Point barcode",
    reviewing: "Reading barcode",
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
                </div>
              )}
              <div className="mt-3 space-y-2">
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
          disabled={scannerStatus === "starting" || scannerStatus === "reviewing"}
          onClick={handleExtract}
        >
          <ScanLine size={18} />
          Extract
        </button>
      </section>

      <section>
        <SectionTitle eyebrow="Detected" title="Ready to add" />
        <div className="mt-3 space-y-3">
          {scanItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-black/5"
            >
              <div className="flex items-center gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-2xl ${item.color}`}>
                  <Leaf size={18} />
                </span>
                <div>
                  <p className="text-sm font-bold">{item.name}</p>
                  <p className="text-xs font-semibold text-[#6c756d]">
                    Expires in {item.expiresIn} days
                  </p>
                </div>
              </div>
              <p className="text-sm font-bold">
                {item.quantity} {item.unit}
              </p>
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
                <span className={`grid h-12 w-12 place-items-center rounded-2xl ${confirmationItem.color}`}>
                  <PackageOpen size={20} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{confirmationItem.category}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-[#6c756d]">
                    {scannedBarcode}
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
  onInputChange,
  onSubmit,
  onPromptSelect,
}: {
  input: string;
  messages: ChatMessage[];
  pantryCount: number;
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
          <ChatBubble key={message.id} message={message} />
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
            placeholder="Ask to cook, add, remove, or shop"
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

function ChatBubble({ message }: { message: ChatMessage }) {
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
                />
              )}
              {message.stretch && message.stretch.length > 0 && (
                <ChatRecipeGroup
                  label="Need 1-2 items"
                  recipes={message.stretch}
                  tone="amber"
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
}: {
  label: string;
  recipes: AiRecommendation[];
  tone: "green" | "amber";
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
          <ChatRecipeCard key={recipe.id} recipe={recipe} tone={tone} />
        ))}
      </div>
    </div>
  );
}

function ChatRecipeCard({
  recipe,
  tone,
}: {
  recipe: AiRecommendation;
  tone: "green" | "amber";
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
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${badgeClass}`}>
          {recipe.match}%
        </span>
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
}: {
  recipeMatches: Array<Recipe & { available: string[]; missing: string[]; match: number }>;
}) {
  return (
    <div className="space-y-5">
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

      <section>
        <SectionTitle eyebrow="Suggested" title="Best matches" />
        <div className="mt-3 space-y-3">
          {recipeMatches.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      </section>
    </div>
  );
}

function RecipeCard({
  recipe,
}: {
  recipe: Recipe & { available: string[]; missing: string[]; match: number };
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
        <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#173b2a] text-white">
          <ChevronRight size={19} />
          <span className="sr-only">Open recipe</span>
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
