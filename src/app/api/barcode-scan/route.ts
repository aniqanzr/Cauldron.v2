import { NextResponse } from "next/server";

type GeminiBarcodePayload = {
  barcode?: unknown;
  productName?: unknown;
  category?: unknown;
  quantity?: unknown;
  unit?: unknown;
  expiresIn?: unknown;
};

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

type NormalizedBarcodePayload = {
  barcode: string;
  productName: string;
  category: string;
  quantity: number;
  unit: string;
  expiresIn: number;
  brand?: string;
  matchedBarcode?: string;
  productImageUrl?: string;
  nutrition?: BarcodeNutrition;
  lookupSource?: "barcode" | "camera" | "openfoodfacts";
  lookupStatus?: "found" | "not_found";
  lookupMessage?: string;
};

type OpenFoodFactsProduct = {
  brands?: unknown;
  categories_tags?: unknown;
  generic_name?: unknown;
  image_front_small_url?: unknown;
  image_url?: unknown;
  nutriments?: Record<string, unknown>;
  nutriscore_grade?: unknown;
  product_name?: unknown;
  product_name_en?: unknown;
  product_quantity?: unknown;
  product_quantity_unit?: unknown;
  quantity?: unknown;
  serving_size?: unknown;
};

type OpenFoodFactsResponse = {
  product?: OpenFoodFactsProduct;
  status?: number;
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const OPEN_FOOD_FACTS_BASE = "https://world.openfoodfacts.org/api/v2/product";
const OPEN_FOOD_FACTS_FIELDS = [
  "brands",
  "categories_tags",
  "generic_name",
  "image_front_small_url",
  "image_url",
  "nutriments",
  "nutriscore_grade",
  "product_name",
  "product_name_en",
  "product_quantity",
  "product_quantity_unit",
  "quantity",
  "serving_size",
].join(",");
const OPEN_FOOD_FACTS_USER_AGENT = "Cauldron/0.1 (https://github.com/aniqanzr)";

export const runtime = "nodejs";

const numberValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const stringValue = (value: unknown) => {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

function barcodeDigits(value: unknown) {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function firstCommaValue(value: unknown) {
  return stringValue(value)
    ?.split(",")
    .map((part) => part.trim())
    .find(Boolean);
}

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function cleanCategoryTag(tag: string) {
  return titleCase(tag.replace(/^[a-z]{2}:/i, "").replace(/-/g, " "));
}

function categoryFromProduct(tags: string[], productName: string) {
  const text = `${tags.join(" ")} ${productName}`.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/(fruit|vegetable|produce|salad|berries|tomato|avocado)/, "Produce"],
    [/(milk|cheese|yogurt|cream|butter|dair)/, "Dairy"],
    [/(meat|beef|chicken|pork|lamb|fish|seafood)/, "Protein"],
    [/(bread|bakery|bun|cake|pastr|tortilla)/, "Bakery"],
    [/(cereal|oat|rice|pasta|noodle|grain|flour)/, "Grains"],
    [/(can|canned|jarred|preserve)/, "Canned"],
    [/(frozen|ice-cream|ice cream)/, "Frozen"],
    [/(sauce|condiment|dressing|spread|jam|honey)/, "Condiments"],
    [/(drink|beverage|juice|water|soda|coffee|tea)/, "Drinks"],
    [/(snack|chips|crisps|cracker|biscuit|cookie|chocolate|confection)/, "Snacks"],
    [/(spice|herb|seasoning)/, "Spices"],
  ];

  for (const [pattern, category] of rules) {
    if (pattern.test(text)) {
      return category;
    }
  }

  const lastTag = tags[tags.length - 1];
  return lastTag ? cleanCategoryTag(lastTag) : "Barcode";
}

function estimatedExpiryDays(category: string) {
  const categoryKey = category.toLowerCase();

  if (categoryKey === "produce") return 5;
  if (categoryKey === "dairy") return 10;
  if (categoryKey === "protein") return 4;
  if (categoryKey === "bakery") return 5;
  if (categoryKey === "frozen") return 180;
  if (categoryKey === "canned") return 730;
  if (categoryKey === "grains") return 365;
  if (categoryKey === "condiments") return 240;
  if (categoryKey === "drinks") return 180;
  if (categoryKey === "snacks") return 180;
  if (categoryKey === "spices") return 730;

  return 90;
}

function productQuantity(product: OpenFoodFactsProduct) {
  const explicitQuantity = numberValue(product.product_quantity);
  const explicitUnit = stringValue(product.product_quantity_unit)?.toLowerCase();

  if (explicitQuantity && explicitQuantity > 0 && explicitUnit) {
    return { quantity: explicitQuantity, unit: explicitUnit };
  }

  const quantityText = stringValue(product.quantity);
  const match = quantityText?.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|oz|lb|item|items|pack|packs)/i);

  if (!match) {
    return { quantity: 1, unit: "item" };
  }

  const quantity = Number.parseFloat(match[1].replace(",", "."));
  const unit = match[2].toLowerCase();

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { quantity: 1, unit: "item" };
  }

  if (unit === "kg") return { quantity: quantity * 1000, unit: "g" };
  if (unit === "l") return { quantity: quantity * 1000, unit: "ml" };
  if (unit === "items") return { quantity, unit: "item" };
  if (unit === "packs") return { quantity, unit: "pack" };

  return { quantity, unit };
}

function nutritionFromProduct(product: OpenFoodFactsProduct): BarcodeNutrition | undefined {
  const nutriments = product.nutriments || {};
  const energyKj = numberValue(nutriments["energy-kj_100g"]);
  const calories =
    numberValue(nutriments["energy-kcal_100g"]) ??
    (energyKj ? Number((energyKj / 4.184).toFixed(0)) : undefined);
  const sodiumGrams = numberValue(nutriments["sodium_100g"]);
  const nutrition: BarcodeNutrition = {
    basis: "per 100g",
    calories,
    protein: numberValue(nutriments.proteins_100g),
    carbs: numberValue(nutriments.carbohydrates_100g),
    fat: numberValue(nutriments.fat_100g),
    sugar: numberValue(nutriments.sugars_100g),
    fiber: numberValue(nutriments.fiber_100g),
    sodiumMg: sodiumGrams ? Number((sodiumGrams * 1000).toFixed(0)) : undefined,
    nutriScore: stringValue(product.nutriscore_grade)?.toUpperCase(),
    servingSize: stringValue(product.serving_size),
  };
  const hasNutrition = Object.entries(nutrition).some(
    ([key, value]) => key !== "basis" && value !== undefined,
  );

  return hasNutrition ? nutrition : undefined;
}

function productNameWithBrand(productName: string, brand?: string) {
  if (!brand) {
    return productName;
  }

  return productName.toLowerCase().includes(brand.toLowerCase())
    ? productName
    : `${brand} ${productName}`;
}

function barcodeLookupCandidates(barcode: string) {
  const candidates = new Set([barcode]);

  if (barcode.length === 12) {
    candidates.add(`0${barcode}`);
  }

  if (barcode.length === 13 && barcode.startsWith("0")) {
    candidates.add(barcode.slice(1));
  }

  if (barcode.length === 11) {
    candidates.add(`0${barcode}`);
    candidates.add(`00${barcode}`);
  }

  const withoutLeadingZeros = barcode.replace(/^0+/, "");

  if (withoutLeadingZeros && withoutLeadingZeros !== barcode) {
    candidates.add(withoutLeadingZeros);
  }

  return [...candidates];
}

async function lookupOpenFoodFacts(
  lookupBarcode: string,
  scannedBarcode = lookupBarcode,
): Promise<NormalizedBarcodePayload | null> {
  const url = `${OPEN_FOOD_FACTS_BASE}/${encodeURIComponent(lookupBarcode)}.json?fields=${OPEN_FOOD_FACTS_FIELDS}`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": OPEN_FOOD_FACTS_USER_AGENT,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as OpenFoodFactsResponse;

    if (data.status !== 1 || !data.product) {
      return null;
    }

    const product = data.product;
    const brand = firstCommaValue(product.brands);
    const rawProductName =
      stringValue(product.product_name) ||
      stringValue(product.product_name_en) ||
      stringValue(product.generic_name);

    if (!rawProductName) {
      return null;
    }

    const productName = productNameWithBrand(rawProductName, brand);
    const tags = stringArray(product.categories_tags);
    const category = categoryFromProduct(tags, productName);
    const quantity = productQuantity(product);

    return {
      barcode: scannedBarcode,
      matchedBarcode: lookupBarcode,
      productName,
      brand,
      category,
      ...quantity,
      expiresIn: estimatedExpiryDays(category),
      productImageUrl: stringValue(product.image_front_small_url) || stringValue(product.image_url),
      nutrition: nutritionFromProduct(product),
      lookupSource: "openfoodfacts",
      lookupStatus: "found",
    };
  } catch {
    return null;
  }
}

function fallbackBarcodePayload(barcode: string): NormalizedBarcodePayload {
  const compactCode = barcode.length > 4 ? barcode.slice(-4) : barcode;

  return {
    barcode,
    productName: `Scanned item ${compactCode}`,
    category: "Barcode",
    quantity: 1,
    unit: "item",
    expiresIn: 14,
    lookupSource: "barcode",
    lookupStatus: "not_found",
    lookupMessage: "No product match found in Open Food Facts.",
  };
}

async function enrichBarcodePayload(payload: NormalizedBarcodePayload) {
  for (const lookupBarcode of barcodeLookupCandidates(payload.barcode)) {
    const lookup = await lookupOpenFoodFacts(lookupBarcode, payload.barcode);

    if (lookup) {
      return lookup;
    }
  }

  return {
    ...payload,
    lookupStatus: "not_found" as const,
    lookupMessage: "No product match found in Open Food Facts.",
  };
}

function parseGeminiText(value: string) {
  const cleaned = value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned) as GeminiBarcodePayload;
}

function barcodeSchema() {
  return {
    type: "OBJECT",
    properties: {
      barcode: { type: "STRING" },
      productName: { type: "STRING" },
      category: { type: "STRING" },
      quantity: { type: "NUMBER" },
      unit: { type: "STRING" },
      expiresIn: { type: "NUMBER" },
    },
    required: ["barcode", "productName", "category", "quantity", "unit", "expiresIn"],
  };
}

function normalizeBarcodePayload(payload: GeminiBarcodePayload) {
  const barcode = barcodeDigits(payload.barcode);

  if (!barcode) {
    return null;
  }

  const productName =
    typeof payload.productName === "string" && payload.productName.trim()
      ? payload.productName.trim()
      : fallbackBarcodePayload(barcode).productName;
  const category =
    typeof payload.category === "string" && payload.category.trim()
      ? payload.category.trim()
      : "Barcode";

  return {
    barcode,
    productName,
    category,
    quantity: numberValue(payload.quantity) ?? 1,
    unit:
      typeof payload.unit === "string" && payload.unit.trim()
        ? payload.unit.trim()
        : "item",
    expiresIn: numberValue(payload.expiresIn) ?? 14,
    lookupSource: "camera" as const,
    lookupStatus: "not_found" as const,
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    barcode?: unknown;
    imageDataUrl?: unknown;
  };
  const directBarcode = barcodeDigits(body.barcode);

  if (directBarcode) {
    return NextResponse.json(await enrichBarcodePayload(fallbackBarcodePayload(directBarcode)));
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";
  const match = imageDataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i);

  if (!match) {
    return NextResponse.json(
      { error: "A camera frame image or barcode number is required." },
      { status: 400 },
    );
  }

  const mimeType = match[1].replace("image/jpg", "image/jpeg");
  const imageData = match[2];

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
            text: "You read grocery item barcode camera frames for Cauldron. Return only valid JSON matching the provided schema.",
          },
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [
                  "Read the visible barcode digits from this image.",
                  "If a product name is visible, use it. Otherwise make productName Scanned item plus the last 4 barcode digits.",
                  "Use a practical pantry category, quantity 1, unit item, and expiresIn 14 unless the image strongly implies something else.",
                  "Do not invent a barcode if digits are not visible.",
                ].join(" "),
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageData,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          response_schema: barcodeSchema(),
          temperature: 0,
        },
      }),
    },
  );

  if (!response.ok) {
    await response.text();
    return NextResponse.json(
      { error: "Gemini barcode scan failed." },
      { status: response.status },
    );
  }

  const data = await response.json();
  const geminiText = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || "")
    .join("");

  if (!geminiText) {
    return NextResponse.json(
      { error: "Gemini returned an empty barcode response." },
      { status: 502 },
    );
  }

  try {
    const normalizedPayload = normalizeBarcodePayload(parseGeminiText(geminiText));

    if (!normalizedPayload) {
      return NextResponse.json(
        { error: "No readable barcode was found." },
        { status: 422 },
      );
    }

    return NextResponse.json(await enrichBarcodePayload(normalizedPayload));
  } catch {
    return NextResponse.json(
      { error: "Gemini returned invalid barcode JSON." },
      { status: 502 },
    );
  }
}
