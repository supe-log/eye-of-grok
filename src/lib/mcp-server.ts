import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { analyzeOrg } from "./analyze-org";
import { addFeedback, getHarness, runRetro } from "./harness-store";
import { feedbackInputSchema } from "./harness-types";
import { botDescription } from "./plan-export";
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

  server.registerTool(
    "get_team_plan",
    {
      title: "Get team plan",
      description:
        "Read the designed Bot team for a business: every Bot's name, title, description with rules, autonomy, skills, routines (disabled), and group chats. Build the team in Grok Bot from this.",
      inputSchema: {
        orgId: z.string(),
      },
    },
    async ({ orgId }) => {
      const state = await getHarness(orgId);
      if (!state) {
        return {
          isError: true,
          content: [{ type: "text", text: `plan_not_found: ${orgId}. Create one at /start.` }],
        };
      }
      const { plan } = state;
      const bots = plan.bots.map((bot) => ({ ...bot, description: botDescription(bot, plan) }));
      return {
        content: [{ type: "text", text: JSON.stringify({ ...plan, bots }) }],
      };
    },
  );

  server.registerTool(
    "record_feedback",
    {
      title: "Record feedback",
      description:
        "Log how a Bot did on a task (source=bot after finishing work, or source=owner for the human's verdict). Feeds the weekly retro.",
      inputSchema: {
        orgId: z.string(),
        feedback: feedbackInputSchema,
      },
    },
    async ({ orgId, feedback }) => {
      const saved = await addFeedback(orgId, feedback);
      return {
        content: [{ type: "text", text: JSON.stringify({ ok: true, id: saved.id }) }],
      };
    },
  );

  server.registerTool(
    "run_retro",
    {
      title: "Run retro",
      description:
        "Turn feedback since the last retro into proposed changes (new rules, autonomy changes, new Bots). The owner approves them in Eye of Grok; nothing changes in Grok Bot until then.",
      inputSchema: {
        orgId: z.string(),
      },
    },
    async ({ orgId }) => {
      const proposals = await runRetro(orgId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              created: proposals.length,
              proposals: proposals.map(({ id, kind, title, why, addsPowers }) => ({
                id,
                kind,
                title,
                why,
                addsPowers,
              })),
            }),
          },
        ],
      };
    },
  );

  return server;
}
