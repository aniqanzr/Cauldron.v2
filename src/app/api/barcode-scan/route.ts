import { NextResponse } from "next/server";

type GeminiBarcodePayload = {
  barcode?: unknown;
  productName?: unknown;
  category?: unknown;
  quantity?: unknown;
  unit?: unknown;
  expiresIn?: unknown;
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
  const barcode = typeof payload.barcode === "string" ? payload.barcode.replace(/\D/g, "") : "";

  if (!barcode) {
    return null;
  }

  const productName =
    typeof payload.productName === "string" && payload.productName.trim()
      ? payload.productName.trim()
      : `Scanned item ${barcode.slice(-4)}`;
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
      { error: "A camera frame image is required." },
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

    return NextResponse.json(normalizedPayload);
  } catch {
    return NextResponse.json(
      { error: "Gemini returned invalid barcode JSON." },
      { status: 502 },
    );
  }
}
