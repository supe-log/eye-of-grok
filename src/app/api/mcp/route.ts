import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { createOrgMcpServer } from "@/lib/mcp-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request): Promise<Response> {
  if (request.method !== "GET" && !isAuthorized(request)) {
    return unauthorized();
  }

  if (request.method === "GET" && request.headers.get("accept")?.includes("text/html")) {
    return Response.json({
      name: "grokbot-org",
      transport: "streamable-http",
      url: "/api/mcp",
      auth: "Authorization: Bearer <INGEST_TOKEN>",
      tools: ["push_org_snapshot", "get_org_view", "analyze_org"],
      rest: {
        get: "/api/orgs/:orgId",
        snapshot: "POST /api/orgs/:orgId/snapshot",
        mermaid: "/api/orgs/:orgId/mermaid",
        share: "/api/share/:orgId",
        map: "/u/:orgId",
      },
    });
  }

  const server = createOrgMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
