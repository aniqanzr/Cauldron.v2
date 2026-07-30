import type { User } from "@supabase/supabase-js";
import { readSupabaseJson, supabaseEndpoint, supabaseHeaders } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type PantryItemInput = {
  id?: string;
  name?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  expiresIn?: number;
  location?: string;
  color?: string;
};

type PantryItemRow = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expires_in: number;
  location: string;
  color: string;
};

type SupabaseErrorPayload = {
  error?: string;
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
};

function jsonError(message: string, status = 400, code?: string, details?: string, hint?: string) {
  return Response.json({ error: message, message, code, details, hint }, { status });
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authorization.slice(7).trim();
}

function pantryTablePath(query?: Record<string, string>) {
  const queryString = query ? `?${new URLSearchParams(query).toString()}` : "";
  return supabaseEndpoint(`/rest/v1/pantry_items${queryString}`);
}

async function getAuthenticatedUser(request: Request) {
  const token = bearerToken(request);

  if (!token) {
    return {
      error: jsonError("Sign in again to sync your pantry.", 401, "missing_auth_token"),
    };
  }

  const response = await fetch(supabaseEndpoint("/auth/v1/user"), {
    headers: supabaseHeaders(token, ""),
  });
  const payload = (await readSupabaseJson(response)) as (User & SupabaseErrorPayload) | null;

  if (!payload || payload.error) {
    return {
      error: jsonError(
        payload?.error || payload?.message || "Sign in again to sync your pantry.",
        payload?.status || response.status || 401,
        payload?.code,
        payload?.details,
        payload?.hint,
      ),
    };
  }

  return {
    token,
    user: payload as User,
  };
}

function itemToRow(item: PantryItemInput, user: User): PantryItemRow | null {
  if (!item.id || !item.name) {
    return null;
  }

  return {
    id: item.id,
    user_id: user.id,
    name: item.name,
    category: item.category || "Other",
    quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
    unit: item.unit || "item",
    expires_in: Number(item.expiresIn) >= 0 ? Number(item.expiresIn) : 14,
    location: item.location || "Pantry",
    color: item.color || "bg-stone-200 text-stone-800",
  };
}

function supabaseErrorResponse(error: SupabaseErrorPayload) {
  return jsonError(
    error.message || error.error || "Could not sync pantry.",
    error.status || 400,
    error.code,
    error.details,
    error.hint,
  );
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);

    if (auth.error) {
      return auth.error;
    }

    const response = await fetch(
      pantryTablePath({
        select: "id,user_id,name,category,quantity,unit,expires_in,location,color",
        user_id: `eq.${auth.user.id}`,
        order: "expires_in.asc",
      }),
      {
        headers: supabaseHeaders(auth.token, ""),
      },
    );
    const payload = (await readSupabaseJson(response)) as PantryItemRow[] | SupabaseErrorPayload;

    if (!response.ok || !Array.isArray(payload)) {
      return supabaseErrorResponse(payload as SupabaseErrorPayload);
    }

    return Response.json({ items: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load pantry.";
    return jsonError(message, 500);
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);

    if (auth.error) {
      return auth.error;
    }

    const body = (await request.json()) as { items?: PantryItemInput[] };
    const rows = (Array.isArray(body.items) ? body.items : [])
      .map((item) => itemToRow(item, auth.user))
      .filter((item): item is PantryItemRow => item !== null);

    const deleteResponse = await fetch(
      pantryTablePath({
        user_id: `eq.${auth.user.id}`,
      }),
      {
        method: "DELETE",
        headers: supabaseHeaders(auth.token, ""),
      },
    );
    const deletePayload = (await readSupabaseJson(deleteResponse)) as SupabaseErrorPayload | null;

    if (!deleteResponse.ok || deletePayload?.error) {
      return supabaseErrorResponse(deletePayload || { message: "Could not clear pantry rows." });
    }

    if (rows.length > 0) {
      const insertResponse = await fetch(pantryTablePath(), {
        method: "POST",
        headers: {
          ...supabaseHeaders(auth.token),
          Prefer: "return=representation",
        },
        body: JSON.stringify(rows),
      });
      const insertPayload = (await readSupabaseJson(insertResponse)) as
        | PantryItemRow[]
        | SupabaseErrorPayload;

      if (!insertResponse.ok || !Array.isArray(insertPayload)) {
        return supabaseErrorResponse(insertPayload as SupabaseErrorPayload);
      }
    }

    return Response.json({ items: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save pantry.";
    return jsonError(message, 500);
  }
}
