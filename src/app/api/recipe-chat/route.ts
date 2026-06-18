import { NextResponse } from "next/server";

type PantryItemInput = {
  name?: unknown;
  quantity?: unknown;
  unit?: unknown;
  category?: unknown;
  expiresIn?: unknown;
  location?: unknown;
};

type GeminiRecipe = {
  name?: unknown;
  time?: unknown;
  style?: unknown;
  energy?: unknown;
  ingredients?: unknown;
  available?: unknown;
  missing?: unknown;
  highlight?: unknown;
};

type GeminiPantryAction = {
  type?: unknown;
  name?: unknown;
  quantity?: unknown;
  unit?: unknown;
  category?: unknown;
  expiresIn?: unknown;
  location?: unknown;
  reason?: unknown;
};

type GeminiShoppingItem = {
  name?: unknown;
  reason?: unknown;
  goal?: unknown;
  priority?: unknown;
};

type GeminiPayload = {
  text?: unknown;
  ready?: unknown;
  stretch?: unknown;
  pantryActions?: unknown;
  shoppingList?: unknown;
  nutritionNotes?: unknown;
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export const runtime = "nodejs";

const stringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

const normalize = (value: string) => value.toLowerCase().trim();

const slug = (value: string) =>
  normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const numberValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

function sanitizePantry(items: PantryItemInput[]) {
  return items
    .map((item) => ({
      name: typeof item.name === "string" ? item.name.trim() : "",
      quantity: numberValue(item.quantity) ?? 1,
      unit: typeof item.unit === "string" ? item.unit.trim() : "item",
      category: typeof item.category === "string" ? item.category.trim() : "Other",
      expiresIn: typeof item.expiresIn === "number" ? item.expiresIn : null,
      location: typeof item.location === "string" ? item.location.trim() : "Pantry",
    }))
    .filter((item) => item.name.length > 0);
}

function parseGeminiText(value: string) {
  const cleaned = value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned) as GeminiPayload;
}

function normalizeRecipe(recipe: GeminiRecipe, pantryNames: Set<string>) {
  const name = typeof recipe.name === "string" ? recipe.name.trim() : "";
  const ingredients = stringArray(recipe.ingredients).map((item) => item.trim());
  const explicitMissing = stringArray(recipe.missing).map((item) => item.trim());
  const inferredMissing = ingredients.filter(
    (ingredient) => !pantryNames.has(normalize(ingredient)),
  );
  const missing = (explicitMissing.length > 0 ? explicitMissing : inferredMissing).slice(0, 2);
  const available =
    stringArray(recipe.available).length > 0
      ? stringArray(recipe.available).map((item) => item.trim())
      : ingredients.filter((ingredient) => pantryNames.has(normalize(ingredient)));

  return {
    id: slug(name || "gemini-recipe"),
    name,
    time: typeof recipe.time === "string" ? recipe.time.trim() : "25 min",
    style: typeof recipe.style === "string" ? recipe.style.trim() : "Flexible",
    energy: typeof recipe.energy === "string" ? recipe.energy.trim() : "Pantry first",
    ingredients,
    optionalMissing: [],
    available,
    missing,
    match:
      ingredients.length > 0
        ? Math.round(((ingredients.length - missing.length) / ingredients.length) * 100)
        : 100,
    highlight:
      typeof recipe.highlight === "string"
        ? recipe.highlight.trim()
        : "Chosen from your pantry ingredients",
  };
}

function normalizePantryAction(action: GeminiPantryAction) {
  const type = typeof action.type === "string" ? normalize(action.type) : "";
  const name =
    typeof action.name === "string" && action.name.trim()
      ? action.name.trim()
      : type === "clear"
        ? "Pantry"
        : "";

  if (!["add", "remove", "update", "clear"].includes(type) || !name) {
    return null;
  }

  return {
    type: type as "add" | "remove" | "update" | "clear",
    name,
    quantity: numberValue(action.quantity) ?? (type === "add" ? 1 : undefined),
    unit: typeof action.unit === "string" && action.unit.trim() ? action.unit.trim() : "item",
    category:
      typeof action.category === "string" && action.category.trim()
        ? action.category.trim()
        : "Other",
    expiresIn: numberValue(action.expiresIn) ?? (type === "add" ? 14 : undefined),
    location:
      typeof action.location === "string" && action.location.trim()
        ? action.location.trim()
        : "Pantry",
    reason: typeof action.reason === "string" ? action.reason.trim() : "",
  };
}

function normalizeShoppingItem(item: GeminiShoppingItem) {
  const name = typeof item.name === "string" ? item.name.trim() : "";

  if (!name) {
    return null;
  }

  return {
    name,
    reason: typeof item.reason === "string" ? item.reason.trim() : "Supports your goal",
    goal: typeof item.goal === "string" ? item.goal.trim() : "Nutrition",
    priority: typeof item.priority === "string" ? item.priority.trim() : "Medium",
  };
}

function assistantSchema() {
  const recipe = {
    type: "OBJECT",
    properties: {
      name: { type: "STRING" },
      time: { type: "STRING" },
      style: { type: "STRING" },
      energy: { type: "STRING" },
      highlight: { type: "STRING" },
      ingredients: { type: "ARRAY", items: { type: "STRING" } },
      available: { type: "ARRAY", items: { type: "STRING" } },
      missing: { type: "ARRAY", items: { type: "STRING" } },
    },
    required: ["name", "time", "style", "highlight", "ingredients", "available", "missing"],
  };

  return {
    type: "OBJECT",
    properties: {
      text: { type: "STRING" },
      pantryActions: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING" },
            name: { type: "STRING" },
            quantity: { type: "NUMBER" },
            unit: { type: "STRING" },
            category: { type: "STRING" },
            expiresIn: { type: "NUMBER" },
            location: { type: "STRING" },
            reason: { type: "STRING" },
          },
          required: ["type", "name", "reason"],
        },
      },
      shoppingList: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            reason: { type: "STRING" },
            goal: { type: "STRING" },
            priority: { type: "STRING" },
          },
          required: ["name", "reason", "goal", "priority"],
        },
      },
      nutritionNotes: {
        type: "ARRAY",
        items: { type: "STRING" },
      },
      ready: {
        type: "ARRAY",
        items: recipe,
      },
      stretch: {
        type: "ARRAY",
        items: recipe,
      },
    },
    required: ["text", "pantryActions", "shoppingList", "nutritionNotes", "ready", "stretch"],
  };
}

function buildPrompt(prompt: string, pantry: ReturnType<typeof sanitizePantry>) {
  return [
    `User request: ${prompt}`,
    "",
    "Current pantry:",
    ...pantry.map((item) => {
      const expires = item.expiresIn === null ? "unknown expiry" : `expires in ${item.expiresIn} days`;
      return `- ${item.name}: ${item.quantity} ${item.unit}, ${item.category}, ${item.location}, ${expires}`;
    }),
    "",
    "You are an app assistant for Cauldron. You may help with pantry management, recipe ideas, shopping suggestions, and nutrition goals.",
    "Return pantryActions only when the user clearly asks to add, remove, update, or clear pantry items. Use action type add, remove, update, or clear.",
    "For clear-all requests such as remove all items, empty pantry, or delete everything, return one pantryAction with type clear and name Pantry.",
    "For remove and update, prefer exact current pantry item names. For add, include quantity, unit, category, location, and a reasonable expiresIn estimate.",
    "For nutrition goals, suggest ingredients to buy in shoppingList and explain why in nutritionNotes. Do not add suggested shopping items to the pantry unless the user explicitly says to add them.",
    "If the user asks for recipes, return exactly 3 ready recipes and exactly 2 stretch recipes. Ready recipes must use only pantry ingredients. Stretch recipes must require only 1 or 2 ingredients that are not in the pantry.",
    "If the user does not ask for recipes, ready and stretch may be empty arrays.",
    "Keep text concise and action-oriented.",
  ].join("\n");
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as {
    prompt?: unknown;
    pantry?: unknown;
  };
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const pantry = sanitizePantry(Array.isArray(body.pantry) ? body.pantry : []);

  if (!prompt || pantry.length === 0) {
    return NextResponse.json(
      { error: "A prompt and pantry items are required." },
      { status: 400 },
    );
  }

  const response = await fetch(
    `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: {
            text: "You are Cauldron, a concise app assistant. Return only valid JSON matching the provided schema.",
          },
        },
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(prompt, pantry) }],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          response_schema: assistantSchema(),
          temperature: 0.25,
        },
      }),
    },
  );

  if (!response.ok) {
    await response.text();
    return NextResponse.json(
      { error: "Gemini request failed." },
      { status: response.status },
    );
  }

  const data = await response.json();
  const geminiText = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || "")
    .join("");

  if (!geminiText) {
    return NextResponse.json(
      { error: "Gemini returned an empty response." },
      { status: 502 },
    );
  }

  try {
    const payload = parseGeminiText(geminiText);
    const pantryNames = new Set(pantry.map((item) => normalize(item.name)));
    const normalizedReady = Array.isArray(payload.ready)
      ? payload.ready
          .map((recipe) => normalizeRecipe(recipe as GeminiRecipe, pantryNames))
          .filter((recipe) => recipe.name && recipe.missing.length === 0)
          .slice(0, 3)
      : [];
    const normalizedStretch = Array.isArray(payload.stretch)
      ? payload.stretch
          .map((recipe) => normalizeRecipe(recipe as GeminiRecipe, pantryNames))
          .filter((recipe) => recipe.name && recipe.missing.length >= 1 && recipe.missing.length <= 2)
          .slice(0, 2)
      : [];
    const pantryActions = Array.isArray(payload.pantryActions)
      ? payload.pantryActions
          .map((action) => normalizePantryAction(action as GeminiPantryAction))
          .filter((action): action is NonNullable<typeof action> => action !== null)
          .slice(0, 5)
      : [];
    const shoppingList = Array.isArray(payload.shoppingList)
      ? payload.shoppingList
          .map((item) => normalizeShoppingItem(item as GeminiShoppingItem))
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .slice(0, 6)
      : [];
    const nutritionNotes = stringArray(payload.nutritionNotes).slice(0, 4);

    return NextResponse.json({
      text:
        typeof payload.text === "string"
          ? payload.text
          : "I updated Cauldron based on your request.",
      ready: normalizedReady,
      stretch: normalizedStretch,
      pantryActions,
      shoppingList,
      nutritionNotes,
      source: "gemini",
    });
  } catch {
    return NextResponse.json(
      { error: "Gemini returned invalid JSON." },
      { status: 502 },
    );
  }
}
