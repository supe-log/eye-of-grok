# Eye of Grok

A human-facing map of a Grok Bot account: bots, group spaces, stale rooms, and a lean cleanup plan. The Chief of Staff pushes the roster. People judge. Nothing deletes a Bot.

Repo: [github.com/supe-log/eye-of-grok](https://github.com/supe-log/eye-of-grok)

## Why

Grok Bot scales like a company. Fifty bots and group chats, six people per room, per-bot memory, a shared computer, hidden bots that still run routines. There is no official roster API and no org dashboard — xAI left coordination to a Chief of Staff. This site is the readout that Bot writes to.

## Run

```bash
npm install
cp .env.example .env.local
# optional: add XAI_API_KEY so Analyze uses grok-4.6
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The messy startup fixture loads on first request.

## Demo (90 seconds)

See [DEMO.md](./DEMO.md).

## API

| Method | Path | Auth | What |
| --- | --- | --- | --- |
| GET | `/api/orgs/startup` | no | Current snapshot (seeds fixture) |
| GET | `/api/orgs/startup?reset=1` | no | Replace with the fixture |
| POST | `/api/orgs/startup/snapshot` | Bearer | Push / replace the graph |
| GET | `/api/orgs/startup/mermaid` | no | Flowchart source |
| POST | `/api/orgs/startup/analyze` | no | Grok 4.6 lean plan (heuristic fallback) |
| GET/POST | `/api/mcp` | Bearer on writes | `push_org_snapshot`, `get_org_view`, `analyze_org` |

Default ingest token: `hackathon-demo`.

Give the Chief of Staff the website URL, or a public HTTPS MCP URL (`/api/mcp`) plus the bearer token. In Grok Bot, add a remote MCP server by asking the Bot in chat. This app does not hide or delete real Bots.

## Schema

`OrgSnapshot` is the source of truth. Mermaid is an export. Nodes: `bot` | `group` | `human`. Status: `active` | `stale` | `hidden` | `deprecated` | `duplicate`. Edges: `reports_to` | `member_of` | `handoff` | `shares_context`.
