export const LOCAL_SNAPSHOT_URL = "http://127.0.0.1:3002/api/local/snapshot";

export function publicOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://127.0.0.1:3002";
}

export function mapUrl(origin: string, orgId: string): string {
  return `${origin.replace(/\/$/, "")}/u/${orgId}`;
}

export function snapshotPostUrl(origin: string, orgId: string): string {
  return `${origin.replace(/\/$/, "")}/api/orgs/${orgId}/snapshot`;
}

export function mcpUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/mcp`;
}

export function createBotSharePrompt(input: {
  origin: string;
  orgId: string;
  token: string;
  ownerName?: string;
}): string {
  const origin = input.origin.replace(/\/$/, "");
  const token = input.token;
  const owner = input.ownerName ?? input.orgId;
  const view = mapUrl(origin, input.orgId);
  const post = snapshotPostUrl(origin, input.orgId);
  const mcp = mcpUrl(origin);

  return `Map ${owner}'s Grok Bot account into Eye of Grok NOW.

Do this immediately — do not wait for more questions.

POST ${post}
Content-Type: application/json
Authorization: Bearer ${token}

Include EVERYTHING you can see in the sidebar and account:
- the human owner (kind=human)
- every Bot (name, title/job, status: active | stale | hidden | deprecated | duplicate)
- every group chat / space
- sidebar sections as groups titled "Sidebar section"
- who reports to whom (reports_to) and room membership (member_of)
- account-level tools / plugins / MCP / connectors as a top-level "tools" string array (names only)

Do NOT include transcripts, memory, file contents, or secrets.

orgId must be "${input.orgId}".
Map URL: ${view}

Optional MCP: ${mcp} with the same bearer. Call push_org_snapshot with orgId "${input.orgId}".

JSON shape:
{
  "orgId": "${input.orgId}",
  "pushedAt": "<ISO now>",
  "source": "chief_of_staff",
  "tools": ["<plugin or MCP name>"],
  "nodes": [
    { "id": "human-you", "kind": "human", "name": "${owner}", "title": "You", "status": "active" },
    { "id": "bot-cos", "kind": "bot", "name": "<name>", "title": "<job>", "status": "active" },
    { "id": "grp-example", "kind": "group", "name": "<space>", "title": "Group chat", "status": "active" }
  ],
  "edges": [
    { "id": "e-1", "from": "bot-cos", "to": "human-you", "kind": "reports_to" },
    { "id": "e-2", "from": "bot-cos", "to": "grp-example", "kind": "member_of" }
  ]
}

Then reply with the node count and ${view}`;
}

export function createBotSpeakLine(input: {
  origin: string;
  orgId: string;
  token: string;
}): string {
  const origin = input.origin.replace(/\/$/, "");
  const token = input.token;
  const view = mapUrl(origin, input.orgId);
  const post = snapshotPostUrl(origin, input.orgId);
  return `Push my entire Grok Bot setup into Eye of Grok right now. POST every Bot, group chat, sidebar section, status (active/stale/hidden/deprecated/duplicate), reporting lines, and account tool/plugin/MCP names (no transcripts or keys) to ${post} with header Authorization: Bearer ${token}. orgId is "${input.orgId}". Then give me ${view}`;
}

export const CASEY_LOCAL_PROMPT = `You are on Logan May's Mac. Local tools / local egress can reach this laptop.

Push this Grok Bot account's roster into Eye of Grok so it appears at http://127.0.0.1:3002/u/mine

1. From memory and the sidebar, list every Bot and group chat you know: name, title/job, status (active | stale | hidden | deprecated | duplicate), who they report to, which spaces they sit in.
2. Include Logan May as kind=human.
3. Do not include transcripts, memory text, API keys, or file contents.
4. POST JSON to ${LOCAL_SNAPSHOT_URL}
   Content-Type: application/json
   No auth needed from this machine.

Shape:
{
  "orgId": "mine",
  "pushedAt": "<ISO now>",
  "source": "chief_of_staff",
  "nodes": [
    { "id": "human-logan-may", "kind": "human", "name": "Logan May", "title": "You", "status": "active" },
    { "id": "bot-cos", "kind": "bot", "name": "<name>", "title": "<job>", "status": "active" },
    { "id": "grp-example", "kind": "group", "name": "<space>", "title": "Group chat", "status": "active" }
  ],
  "edges": [
    { "id": "e-1", "from": "bot-cos", "to": "human-logan-may", "kind": "reports_to" },
    { "id": "e-2", "from": "bot-cos", "to": "grp-example", "kind": "member_of" }
  ]
}

kinds: bot | group | human
edge kinds: reports_to | member_of | handoff | shares_context

Then tell Logan how many nodes you posted.`;
