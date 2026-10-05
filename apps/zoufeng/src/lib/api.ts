import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError("Invalid JSON body", 400);
  }
  return schema.parse(raw);
}

export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof ZodError) return fail(e.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "), 422);
      if (e instanceof HttpError) return fail(e.message, e.status);
      const msg = e instanceof Error ? e.message : String(e);
      if (/UNIQUE constraint failed/i.test(msg)) return fail("A record with this unique value already exists", 409);
      if (/FOREIGN KEY constraint failed/i.test(msg)) return fail("This record is referenced by other data", 409);
      console.error(e);
      return fail("Internal server error", 500);
    }
  };
}
