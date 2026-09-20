# Live ingest

Public share: people claim `/u/<slug>` on the home page and paste **Copy Bot prompt** into their Grok Bot. Writes go to `POST /api/orgs/<slug>/snapshot` with bearer `hackathon-demo`. MCP is `/api/mcp`.

# Localhost only

Grok Bot **cloud MCP cannot reach** `localhost`. Do not add `http://127.0.0.1:3002/api/mcp` as a remote MCP server.

If Grok Bot has **local egress** (`localEgressAllowed`, local tools allowed), a Bot can POST to the local API. Eye of Grok polls `GET /api/orgs/mine` every 2.5s and redraws.

There is **no official roster API**. Encrypted app data under `~/Library/Application Support/Grok Bot` is not imported.

## API to use (this device)

```
POST http://127.0.0.1:3002/api/local/snapshot
Content-Type: application/json
```

Loopback only (`127.0.0.1`, `localhost`, IPv4-mapped `::ffff:127.0.0.1`). No bearer token.

Same body as `POST /api/orgs/mine/snapshot`. Always written to org `mine`.

## What to tell the Chief of Staff

Open the **Live** tab and copy the local prompt, or `GET http://127.0.0.1:3002/api/local/snapshot` and use the `prompt` field.

## Where the key is

There is **no xAI key** on this project. The only secret for Bot write access is `INGEST_TOKEN`.

| Place | Value |
| --- | --- |
| [`.env.example`](.env.example) | `INGEST_TOKEN=hackathon-demo` (this is the checked-in default) |
| [`.env.local`](.env.local) | Does **not** exist yet. Create it only if you want a different token |
| [`src/lib/auth.ts`](src/lib/auth.ts) | `process.env.INGEST_TOKEN ?? "hackathon-demo"` — if env is missing, this default is used |

On **loopback**, POST `/api/local/snapshot` needs **no token**.  
On **phone / cloud / any other machine**, the Bot must send:

```http
Authorization: Bearer hackathon-demo
```

`XAI_API_KEY` / `GROK_API_KEY` in `.env.example` are only for the parked analyze pass. Leave them blank.

## Anywhere (phone, other computers, cloud Bot)

`localhost:3002` is this machine only. Grok Bot’s MCP client and the phone app **cannot** see it.

**Easiest live path:** put the site on a public HTTPS URL, then give the Chief of Staff that URL + the bearer. Do **not** use unofficial Grok Bot CLIs (they depend on a local session and do not help a phone). Giving the GitHub repo lets a Bot *read the schema*; it does not give a live map.

| Path | Works from phone? | Laptop must stay on? | What you give the Bot |
| --- | --- | --- | --- |
| `http://127.0.0.1:3002` | No | Yes | Local prompt only |
| Tunnel (ngrok / Cloudflare) to :3002 | Yes | Yes | Public URL + bearer |
| Deployed site (Vercel) | Yes | No | Public URL + bearer + optional MCP |

Once you have a public origin `https://YOUR-HOST`:

```
Open:     https://YOUR-HOST
Read:     GET https://YOUR-HOST/api/orgs/mine
Picture:  GET https://YOUR-HOST/api/orgs/mine/mermaid
Write:    POST https://YOUR-HOST/api/orgs/mine/snapshot
Header:   Authorization: Bearer hackathon-demo
MCP:      https://YOUR-HOST/api/mcp   (same bearer on writes)
```

Paste that card into the Chief of Staff. Do not add `http://localhost:3002/api/mcp` as a remote MCP server.

## What will not work

| Idea | Why |
| --- | --- |
| Remote MCP `http://localhost:3002/api/mcp` | The Bot's MCP client runs in the cloud |
| grok.com connectors | Different product |
| Cursor `mcp.json` / Grok Build `grok mcp` | Not Grok Bot |
| Official “list my bots” API | Does not exist |
