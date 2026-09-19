import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { resolveAuthorizedOrgId, unauthorized } from "@/lib/auth";
import { createOrgMcpServer } from "@/lib/mcp-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request): Promise<Response> {
  if (request.method === "GET" && request.headers.get("accept")?.includes("text/html")) {
    return Response.json({
      name: "grokbot-org",
      transport: "streamable-http",
      url: "/api/mcp",
      auth: "Authorization: Bearer <that org's ingest token>",
      tools: ["push_org_snapshot", "get_org_view", "analyze_org"],
      rest: {
        claim: "POST /api/orgs/claim",
        get: "/api/orgs/:orgId",
        snapshot: "POST /api/orgs/:orgId/snapshot",
        mermaid: "/api/orgs/:orgId/mermaid",
        share: "/api/share/:orgId",
        rotate: "POST /api/orgs/:orgId/rotate",
        map: "/u/:orgId",
      },
    });
  }

  if (request.method !== "GET") {
    const writerOrgId = await resolveAuthorizedOrgId(request);
    if (!writerOrgId) return unauthorized();
    const server = createOrgMcpServer({ writerOrgId });
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    return transport.handleRequest(request);
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
