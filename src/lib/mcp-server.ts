import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { analyzeOrg } from "./analyze-org";
import { snapshotToMermaid } from "./mermaid";
import { orgSnapshotSchema } from "./schema";
import { getOrg, upsertOrg } from "./store";
import { DEFAULT_ORG_ID } from "./types";

export function createOrgMcpServer(): McpServer {
  const server = new McpServer({
    name: "grokbot-org",
    version: "0.1.0",
  });

  server.registerTool(
    "push_org_snapshot",
    {
      title: "Push org snapshot",
      description:
        "Replace the Grok Bot org map with a roster snapshot. Names, titles, statuses, memberships only — no transcripts or memory.",
      inputSchema: {
        orgId: z.string().default(DEFAULT_ORG_ID),
        snapshot: orgSnapshotSchema,
      },
    },
    async ({ orgId, snapshot }) => {
      const saved = await upsertOrg(orgId, snapshot, "chief_of_staff");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ok: true,
              orgId: saved.orgId,
              nodes: saved.nodes.length,
              edges: saved.edges.length,
              pushedAt: saved.pushedAt,
            }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get_org_view",
    {
      title: "Get org view",
      description:
        "Read the current org snapshot and its Mermaid flowchart for humans or a Chief of Staff.",
      inputSchema: {
        orgId: z.string().default(DEFAULT_ORG_ID),
      },
    },
    async ({ orgId }) => {
      const org = await getOrg(orgId);
      if (!org) {
        return {
          isError: true,
          content: [{ type: "text", text: `org_not_found: ${orgId}` }],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              snapshot: org,
              mermaid: snapshotToMermaid(org),
            }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "analyze_org",
    {
      title: "Analyze org",
      description:
        "Recommend hide / merge / close-group / keep for a leaner Grok Bot roster. Does not delete anything.",
      inputSchema: {
        orgId: z.string().default(DEFAULT_ORG_ID),
      },
    },
    async ({ orgId }) => {
      const org = await getOrg(orgId);
      if (!org) {
        return {
          isError: true,
          content: [{ type: "text", text: `org_not_found: ${orgId}` }],
        };
      }
      const result = await analyzeOrg(org);
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    },
  );

  return server;
}
