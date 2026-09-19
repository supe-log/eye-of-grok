# Architecture

Eye of Grok is a **readout** of a Grok Bot account, not a second control plane. Humans (or a Chief of Staff Bot) write a graph. The site draws it. It does not hide or delete real Bots.

## Why this exists

Grok Bot scales like a company: up to **50 Bots + group chats**, **2–6 Bots per group**, per-Bot memory, a shared computer, hidden Bots that still run routines. xAI left coordination to a Chief of Staff and did not ship an org dashboard. There is **no official roster API**.

This app is the map you wish the sidebar was.

## MVP now vs later

| Now | Parked |
| --- | --- |
| Interactive org map (canvas-style DAG) | Grok 4.6 analyze / lean-up (code exists, UI hidden) |
| Live local ingest: Bot POSTs `http://127.0.0.1:3002/api/local/snapshot` | Official “list my bots” API (does not exist) |
| Edit your bots and spaces in the browser | Auto-read the encrypted Grok Bot macOS app data |
| Status colors + “Flag stale” | Hide/delete against real Grok Bot |
| Mermaid export | Multi-tenant / many humans |
| REST + MCP ingest (MCP only after a public URL), per-slug claim | xAI key |

Default **demo** org id is `mine`. Starter graph is **Logan**. Other humans claim `/u/<slug>`. The full sidebar lands when that account's Chief of Staff POSTs a snapshot.

## Data model (source of truth)

JSON snapshot, not Mermaid. Schema: [`src/lib/types.ts`](src/lib/types.ts), Zod: [`src/lib/schema.ts`](src/lib/schema.ts).

```ts
type OrgSnapshot = {
  orgId: string;
  pushedAt: string;
  source: "chief_of_staff" | "manual" | "fixture";
  nodes: Array<{
    id: string;
    kind: "bot" | "group" | "human";
    name: string;
    title?: string;
    status: "active" | "stale" | "hidden" | "deprecated" | "duplicate";
    lastActiveAt?: string;
    notes?: string;
  }>;
  edges: Array<{
    id: string;
    from: string;
    to: string;
    kind: "reports_to" | "member_of" | "handoff" | "shares_context";
  }>;
};
```

- **bot** — a Grok Bot (own memory, own routines).
- **group** — a group chat / space (shared project context).
- **human** — you. Judgment, not dispatcher.
- **reports_to** — org line (specialist → Chief of Staff → you).
- **member_of** — bot → space.
- **handoff** — async bot-to-bot work.
- **shares_context** — overlapping knowledge, not membership.

Do not store transcripts or raw memory.

## How a request flows

```mermaid
flowchart LR
  Human[Human in the UI] -->|Edit| API
  HumanClaim[Human claims slug] -->|POST /api/orgs/claim| API
  Casey[Casey on this Mac] -->|POST /api/local/snapshot| API
  API[Next.js API] --> Store[Neon org_snapshots]
  Store --> Map[Canvas-style DAG polls every 2.5s]
  Store --> Mermaid[Mermaid export]
```

On this laptop, **do not** point Grok Bot cloud MCP at `http://127.0.0.1:3002/api/mcp`. The MCP client runs in the cloud and cannot see localhost. Casey uses **local egress** + REST. MCP is for a public HTTPS host.

Records are `{ orgId, tokenHash, claimedAt, snapshot }`. Primary driver is Neon when `DATABASE_URL` is set (plus revision history). Blob is optional if Neon is unset. Otherwise filesystem (`data/` locally, `/tmp` on Vercel). First `GET /api/orgs/mine` seeds [`src/lib/my-setup.ts`](src/lib/my-setup.ts) and migrates a legacy `data/orgs/mine.json` snapshot if present.

Writes to `POST /api/orgs/:id/snapshot` and MCP need **that org's** bearer. `mine` uses `INGEST_TOKEN` (local default `hackathon-demo`). Loopback `POST /api/local/snapshot` does not.

## File map

| Path | Role |
| --- | --- |
| `src/app/page.tsx` | Home: canvas landing — claim a slug, copy CoS prompt, public gallery |
| `src/app/api/gallery/route.ts` | Public org index (no tokens) |
| `src/app/u/[orgId]/page.tsx` | Canvas map for a claimed slug (`mine` seeds Logan) |
| `src/components/ShareHome.tsx` | Live landing: name → claim → Copy CoS → Open my map |
| `src/components/OrgWorkbench.tsx` | Canvas map, inspect, edit, mermaid, live, revisions |
| `src/components/OrgCanvas.tsx` | Flat reporting-line / spaces diagram |
| `src/lib/layout-graph.ts` | dagre layout for the canvas diagram |
| `src/lib/graph-edit.ts` | Add/remove nodes and links |
| `src/lib/mermaid.ts` | Snapshot → flowchart |
| `src/lib/store.ts` | Org records + claim/rotate/verify |
| `src/lib/db.ts` | Lazy Neon client + schema |
| `src/lib/store-neon.ts` | Primary durable backend |
| `src/lib/store-blob.ts` / `store-fs.ts` | Optional Blob / local filesystem backends |
| `src/lib/tokens.ts` | Mint / hash / `mine` env token |
| `src/lib/fixture.ts` | Old messy-startup sample (unused in UI) |
| `src/lib/analyze.ts` | Parked Grok / heuristic lean-up |
| `src/app/api/orgs/claim/route.ts` | Claim + one-time token reveal |
| `src/app/api/orgs/[id]/*` | REST (snapshot, rotate, mermaid, analyze) |
| `src/app/api/local/snapshot/route.ts` | Loopback ingest for this Mac |
| `src/app/api/mcp/route.ts` | Streamable HTTP MCP |
| `src/lib/mcp-server.ts` | `push_org_snapshot`, `get_org_view`, `analyze_org` |

## Product rules we are not breaking

- Hide ≠ pause (routines still run).
- Delete ≠ wipe the shared computer.
- Duplicate copies profile, not memory.
- Tools/computer are account-level; memory is per Bot.
- The map is a **claimed** org. If the Chief of Staff never saw a hidden Bot, it will not appear.
- Never auto-delete a real Bot from this app.

## Stack

Next.js 16 App Router, React 19, Tailwind 4, `@dagrejs/dagre`, `mermaid`, `zod`, `@modelcontextprotocol/sdk`, `@neondatabase/serverless`. Node 22+ (dev is 26 here). No Supabase. No xAI key for the visualizer MVP.

## Later (analyzer)

`POST /api/orgs/mine/analyze` calls Grok 4.6 when `XAI_API_KEY` or `GROK_API_KEY` is set, else a heuristic. Recommendations must cite existing node ids. UI entry point was removed on purpose.
