import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function mintIngestToken(): string {
  return `eog_${randomBytes(24).toString("base64url")}`;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function secretsEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Logan's `/u/mine` write secret. Local default keeps Mac demos working. */
export function getMineIngestToken(): string | null {
  const fromEnv = process.env.INGEST_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  if (!process.env.VERCEL) return "hackathon-demo";
  return null;
}
