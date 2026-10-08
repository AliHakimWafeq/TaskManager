import { NextResponse } from "next/server";
import { z } from "zod";

/** Reject cross-site browser requests. Non-browser clients (curl, scripts) send no Origin. */
export function isSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/** Wrap a route handler: origin check for writes, consistent JSON errors. */
export function handler<A extends unknown[]>(fn: (req: Request, ...args: A) => Promise<Response>) {
  return async (req: Request, ...args: A) => {
    try {
      if (req.method !== "GET" && !isSameOrigin(req)) throw new HttpError(403, "Cross-origin requests are not allowed");
      return await fn(req, ...args);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      if (e instanceof z.ZodError) {
        const i = e.issues[0];
        return json({ error: `${i?.path.join(".") || "body"}: ${i?.message ?? "invalid"}` }, 400);
      }
      console.error(e);
      return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
    }
  };
}

export async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Body must be JSON");
  }
}
