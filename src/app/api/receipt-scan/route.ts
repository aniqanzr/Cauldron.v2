import { NextResponse } from "next/server";

type GeminiReceiptItem = {
  name?: unknown;
  category?: unknown;
  quantity?: unknown;
  unit?: unknown;
  expiresIn?: unknown;
};

type GeminiReceiptPayload = {
  storeName?: unknown;
  items?: unknown;
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export const runtime = "nodejs";

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

function parseGeminiText(value: string) {
  const cleaned = value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned) as GeminiReceiptPayload;
}

function receiptSchema() {
  return {
    type: "OBJECT",
    properties: {
      storeName: { type: "STRING" },
      items: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            category: { type: "STRING" },
            quantity: { type: "NUMBER" },
            unit: { type: "STRING" },
            expiresIn: { type: "NUMBER" },
          },
          required: ["name", "category", "quantity", "unit", "expiresIn"],
        },
      },
    },
    required: ["storeName", "items"],
  };
}

function normalizeReceiptPayload(payload: GeminiReceiptPayload) {
  const storeName =
    typeof payload.storeName === "string" && payload.storeName.trim()
      ? payload.storeName.trim()
      : "Scanned receipt";
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const seen = new Set<string>();
  const items = rawItems
    .map((item): GeminiReceiptItem => (item && typeof item === "object" ? item : {}))
    .map((item) => {
      const name = typeof item.name === "string" ? item.name.trim() : "";

      if (!name || seen.has(name.toLowerCase())) {
        return null;
      }

      seen.add(name.toLowerCase());

      const category =
        typeof item.category === "string" && item.category.trim()
          ? item.category.trim()
          : "Other";

      return {
        name,
        category,
        quantity: numberValue(item.quantity) ?? 1,
        unit:
          typeof item.unit === "string" && item.unit.trim()
            ? item.unit.trim()
            : "item",
        expiresIn: numberValue(item.expiresIn) ?? 14,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .slice(0, 24);

  return {
    storeName,
    items,
  };
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
    imageDataUrl?: unknown;
  };
  const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";
  const match = imageDataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i);

  if (!match) {
    return NextResponse.json(
      { error: "A receipt image is required." },
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
            text: "You extract grocery pantry items from receipt photos for Cauldron. Return only valid JSON matching the provided schema.",
          },
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [
                  "Read this grocery receipt image and extract only purchased food or pantry items.",
                  "Ignore prices, totals, discounts, payment lines, loyalty text, bags, fees, and non-food household items.",
                  "Use the plain product name a person would expect in a pantry.",
                  "Estimate quantity from visible receipt quantity when possible; otherwise use 1.",
                  "Use practical units such as item, pack, bottle, carton, bag, bunch, can, kg, g, L, or mL.",
                  "Choose a practical category such as Produce, Dairy, Protein, Grains, Bakery, Canned, Frozen, Condiments, Snacks, Drinks, or Other.",
                  "Estimate expiresIn in days from normal storage life. Use longer values for shelf-stable pantry goods.",
                  "Do not invent items that are not visible on the receipt.",
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
          response_schema: receiptSchema(),
          temperature: 0,
        },
      }),
    },
  );

  if (!response.ok) {
    await response.text();
    return NextResponse.json(
      { error: "Gemini receipt scan failed." },
      { status: response.status },
    );
  }

  const data = await response.json();
  const geminiText = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || "")
    .join("");

  if (!geminiText) {
    return NextResponse.json(
      { error: "Gemini returned an empty receipt response." },
      { status: 502 },
    );
  }

  try {
    const normalizedPayload = normalizeReceiptPayload(parseGeminiText(geminiText));

    if (normalizedPayload.items.length === 0) {
      return NextResponse.json(
        { error: "No grocery items were found on this receipt." },
        { status: 422 },
      );
    }

    return NextResponse.json(normalizedPayload);
  } catch {
    return NextResponse.json(
      { error: "Gemini returned invalid receipt JSON." },
      { status: 502 },
    );
  }
}
