import { isLoopbackRequest } from "./loopback";
import { resolveOrgIdForToken, verifyOrgToken } from "./store";

export function bearerFromRequest(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  return header.trim();
}

export async function isAuthorizedForOrg(request: Request, orgId: string): Promise<boolean> {
  if (isLoopbackRequest(request)) return true;
  const token = bearerFromRequest(request);
  if (!token) return false;
  return verifyOrgToken(orgId, token);
}

export async function resolveAuthorizedOrgId(request: Request): Promise<string | null> {
  const token = bearerFromRequest(request);
  if (!token) return null;
  return resolveOrgIdForToken(token);
}

export function unauthorized(hint?: string): Response {
  return Response.json(
    {
      error: "unauthorized",
      hint:
        hint ??
        "Send Authorization: Bearer <that org's ingest token>. Claim a slug on the home page to mint one. Logan's /u/mine uses INGEST_TOKEN (local default hackathon-demo).",
    },
    { status: 401 },
  );
}
