import type { Session, User } from "@supabase/supabase-js";
import { readSupabaseJson, supabaseEndpoint, supabaseHeaders } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type AuthAction = "sign-in" | "sign-up" | "resend-confirmation" | "refresh" | "sign-out";

type AuthRequestBody = {
  action?: AuthAction;
  email?: string;
  password?: string;
  redirectTo?: string;
  refreshToken?: string;
};

type SupabaseAuthPayload = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  expires_at?: number;
  refresh_token?: string;
  user?: User;
  session?: Session | null;
  error?: string;
  code?: string;
  status?: number;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Authentication request failed";
}

function jsonError(message: string, status = 400, code?: string) {
  return Response.json({ error: message, code }, { status });
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authorization.slice(7).trim();
}

function withRedirect(path: string, redirectTo?: string) {
  if (!redirectTo) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${new URLSearchParams({ redirect_to: redirectTo }).toString()}`;
}

function sessionFromPayload(payload: SupabaseAuthPayload) {
  if (payload.session !== undefined) {
    return payload.session;
  }

  if (!payload.access_token || !payload.refresh_token || !payload.expires_in || !payload.user) {
    return null;
  }

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_in: payload.expires_in,
    expires_at: payload.expires_at || Math.floor(Date.now() / 1000) + payload.expires_in,
    token_type: payload.token_type || "bearer",
    user: payload.user,
  } satisfies Session;
}

async function authFetch(
  path: string,
  body: Record<string, unknown>,
  redirectTo?: string,
  accessToken?: string,
) {
  const response = await fetch(supabaseEndpoint(withRedirect(`/auth/v1${path}`, redirectTo)), {
    method: "POST",
    headers: supabaseHeaders(accessToken),
    body: JSON.stringify(body),
  });
  const payload = (await readSupabaseJson(response)) as SupabaseAuthPayload;

  if (payload.error) {
    return {
      error: jsonError(payload.error, payload.status || response.status || 400, payload.code),
    };
  }

  return { payload };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AuthRequestBody;
    const action = body.action;

    if (action === "sign-in") {
      if (!body.email || !body.password) {
        return jsonError("Enter your email and password.");
      }

      const result = await authFetch("/token?grant_type=password", {
        email: body.email,
        password: body.password,
        gotrue_meta_security: {},
      });

      if (result.error) {
        return result.error;
      }

      const session = sessionFromPayload(result.payload);
      return Response.json({ session, user: result.payload.user || session?.user || null });
    }

    if (action === "sign-up") {
      if (!body.email || !body.password) {
        return jsonError("Enter your email and password.");
      }

      const result = await authFetch(
        "/signup",
        {
          email: body.email,
          password: body.password,
          data: {},
          gotrue_meta_security: {},
        },
        body.redirectTo,
      );

      if (result.error) {
        return result.error;
      }

      const session = sessionFromPayload(result.payload);
      return Response.json({ session, user: result.payload.user || session?.user || null });
    }

    if (action === "resend-confirmation") {
      if (!body.email) {
        return jsonError("Enter your email first.");
      }

      const result = await authFetch(
        "/resend",
        {
          email: body.email,
          type: "signup",
          gotrue_meta_security: {},
        },
        body.redirectTo,
      );

      if (result.error) {
        return result.error;
      }

      return Response.json({ ok: true });
    }

    if (action === "refresh") {
      if (!body.refreshToken) {
        return jsonError("No saved session was found.", 401, "missing_refresh_token");
      }

      const result = await authFetch("/token?grant_type=refresh_token", {
        refresh_token: body.refreshToken,
      });

      if (result.error) {
        return result.error;
      }

      const session = sessionFromPayload(result.payload);
      return Response.json({ session, user: result.payload.user || session?.user || null });
    }

    if (action === "sign-out") {
      const token = bearerToken(request);
      const response = await fetch(supabaseEndpoint("/auth/v1/logout"), {
        method: "POST",
        headers: supabaseHeaders(token),
      });
      const payload = (await readSupabaseJson(response)) as SupabaseAuthPayload | null;

      if (payload?.error) {
        return jsonError(payload.error, payload.status || response.status || 400, payload.code);
      }

      return Response.json({ ok: true });
    }

    return jsonError("Unknown authentication action.");
  } catch (error) {
    return jsonError(getErrorMessage(error), 500);
  }
}
