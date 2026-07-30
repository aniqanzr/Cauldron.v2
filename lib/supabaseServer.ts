const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function supabaseEndpoint(path: string) {
  if (!supabaseUrl) {
    throw new Error("Missing Supabase URL");
  }

  return `${supabaseUrl}${path}`;
}

export function supabaseHeaders(accessToken?: string, contentType = "application/json") {
  if (!supabaseAnonKey) {
    throw new Error("Missing Supabase anon key");
  }

  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${accessToken || supabaseAnonKey}`,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

export async function readSupabaseJson(response: Response) {
  const payload = await response.json().catch(() => null);

  if (response.ok) {
    return payload;
  }

  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const message =
    typeof data.msg === "string"
      ? data.msg
      : typeof data.message === "string"
        ? data.message
        : typeof data.error_description === "string"
          ? data.error_description
          : typeof data.error === "string"
            ? data.error
            : "Supabase request failed";

  return {
    error: message,
    code:
      typeof data.error_code === "string"
        ? data.error_code
        : typeof data.code === "string"
          ? data.code
          : undefined,
    details: typeof data.details === "string" ? data.details : undefined,
    hint: typeof data.hint === "string" ? data.hint : undefined,
    status: response.status,
  };
}
