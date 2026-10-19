import { NextResponse } from "next/server";
import { isAuthorized } from "./auth";
import { isLoopbackRequest } from "./loopback";

export function canWrite(request: Request): boolean {
  return isAuthorized(request) || isLoopbackRequest(request);
}

export function requestOrigin(request: Request): string {
  return new URL(request.url).origin;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

/** Map store errors ("code: detail") to HTTP responses. */
export function harnessError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "unknown_error";
  const code = message.split(":")[0] ?? "unknown_error";
  const status = code.endsWith("not_found") ? 404 : code === "unknown_error" ? 500 : 400;
  return NextResponse.json({ error: code, detail: message }, { status });
}
