# Live ingest

Public share: people claim `/u/<slug>` on the home page and paste **Copy Chief of Staff message** into their Grok Bot. That click mints a unique write token. Writes go to `POST /api/orgs/<slug>/snapshot` with `Authorization: Bearer <that-org-token>`. MCP is `/api/mcp` with the same bearer. The prompt is scoped to *their* org — not Logan's `mine` token.

# This Mac only (localhost:3002)

Grok Bot **cloud MCP cannot reach** `localhost`. Do not add `http://127.0.0.1:3002/api/mcp` as a remote MCP server.

On Logan's Mac, Grok Bot has **local egress** (`localEgressAllowed`, local tools always allowed). A Bot can POST to the local API. Eye of Grok polls `GET /api/orgs/mine` every 2.5s and redraws.

There is **no official roster API**. Encrypted app data under `~/Library/Application Support/Grok Bot` is not imported.

## API to use (this device)

```
POST http://127.0.0.1:3002/api/local/snapshot
Content-Type: application/json
```

Loopback only (`127.0.0.1`, `localhost`, IPv4-mapped `::ffff:127.0.0.1`). No bearer token.

Same body as `POST /api/orgs/mine/snapshot`. Always written to org `mine`. **Unchanged from the original Mac demo.**

Loopback `POST /api/orgs/<slug>/snapshot` is also token-light (any claimed slug) so laptop Edit / curl still works without pasting a bearer.

## What to tell Casey

Open the **Live** tab and click **Copy Logan local prompt**, or `GET http://127.0.0.1:3002/api/local/snapshot` and use the `prompt` field.

## Where the keys are

There is **no xAI key** on this project.

| Place | Value |
| --- | --- |
| [`.env.example`](.env.example) | `INGEST_TOKEN=hackathon-demo` for `/u/mine` only. `DATABASE_URL=` for Neon (primary durable store) |
| [`.env.local`](.env.local) | Create to override `INGEST_TOKEN`, add `DATABASE_URL`, or turn analyze on |
| Claimed orgs | Unique `eog_…` token minted on `POST /api/orgs/claim`. Server stores a SHA-256 hash |
| [`src/lib/tokens.ts`](src/lib/tokens.ts) | Local default `hackathon-demo` for `mine` when `INGEST_TOKEN` and `VERCEL` are unset |

On **this Mac**, Casey POSTs to `/api/local/snapshot` and needs **no token**.  
On **phone / cloud / any other machine**, each Bot must send **that org's** bearer (from the home-page copy prompt). Logan's public `/u/mine` still uses:

```http
Authorization: Bearer <INGEST_TOKEN>
```

`hackathon-demo` is **not** a write path for other slugs.

`XAI_API_KEY` / `GROK_API_KEY` in `.env.example` are only for the parked analyze pass. Leave them blank.

## Anywhere (phone, other computers, cloud Bot)

`localhost:3002` is this laptop only. Grok Bot’s MCP client and the phone app **cannot** see it.

**Easiest live path:** deploy the site, attach a Vercel Blob store, then each person claims a slug.

| Path | Works from phone? | Laptop must stay on? | What you give the Bot |
| --- | --- | --- | --- |
| `http://127.0.0.1:3002` | No | Yes | Local Casey prompt only (`mine`) |
| Tunnel (ngrok / Cloudflare) to :3002 | Yes | Yes | Public URL + **that org's** bearer |
| Deployed site (Vercel + Blob) | Yes | No | Claim prompt (URL + unique token) + optional MCP |

Once you have a public origin `https://YOUR-HOST`:

```
Open:     https://YOUR-HOST
Claim:    type your name → Copy Chief of Staff message
Read:     GET https://YOUR-HOST/api/orgs/<slug>
Picture:  GET https://YOUR-HOST/api/orgs/<slug>/mermaid
Write:    POST https://YOUR-HOST/api/orgs/<slug>/snapshot
Header:   Authorization: Bearer <that-org-token>
Rotate:   POST https://YOUR-HOST/api/orgs/<slug>/rotate   (same bearer)
MCP:      https://YOUR-HOST/api/mcp   (same bearer; writes stay on that org)
Health:   GET https://YOUR-HOST/api/health
```

Logan's demo: replace `<slug>` with `mine` and the token with `INGEST_TOKEN`.

Do not add `http://localhost:3002/api/mcp` as a remote MCP server.

## What will not work

| Idea | Why |
| --- | --- |
| Remote MCP `http://localhost:3002/api/mcp` | The Bot's MCP client runs in the cloud |
| grok.com connectors | Different product |
| Cursor `mcp.json` / Grok Build `grok mcp` | Not Grok Bot |
| Official “list my bots” API | Does not exist |
| Sharing `hackathon-demo` with another human | That token is only Logan's local/demo `mine` write secret |
