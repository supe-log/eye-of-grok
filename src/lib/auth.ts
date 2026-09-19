export function getIngestToken(): string {
  return process.env.INGEST_TOKEN ?? "hackathon-demo";
}

export function bearerFromRequest(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  return header.trim();
}

export function isAuthorized(request: Request): boolean {
  const token = bearerFromRequest(request);
  return token !== null && token === getIngestToken();
}

export function unauthorized(): Response {
  return Response.json(
    {
      error: "unauthorized",
      hint: "Send Authorization: Bearer <INGEST_TOKEN>. Default local token is hackathon-demo.",
    },
    { status: 401 },
  );
}
