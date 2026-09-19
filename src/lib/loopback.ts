function isLoopbackIp(value: string): boolean {
  const ip = value.trim().toLowerCase();
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1" ||
    ip.startsWith("127.")
  );
}

export function isLoopbackRequest(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim() ?? "";
    if (first && !isLoopbackIp(first)) return false;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp && !isLoopbackIp(realIp)) return false;
  const host = (request.headers.get("host") ?? "").toLowerCase();
  return (
    host.startsWith("127.0.0.1") ||
    host.startsWith("localhost") ||
    host.startsWith("[::1]")
  );
}
