# Teammate handoff

Repo: https://github.com/supe-log/eye-of-grok  
You have **Write** (push). The owner is `supe-log`.

**How the product works:** a human claims a slug on the live site, copies a Chief of Staff prompt (that slug’s POST URL + write token), pastes it into their Grok Bot, and only `/u/<slug>` fills in. Maps are public to read. Full numbered steps: [README — How it works (end to end)](README.md#how-it-works-end-to-end). **Merge to `main` ships UI** — that is the production deploy once the GitHub repo is connected in Vercel (Production Branch = `main`). PRs get a Vercel preview when GitHub is linked.

## Clone and run

```bash
git clone https://github.com/supe-log/eye-of-grok.git
cd eye-of-grok
npm install
npm run dev
```

Open the URL Next prints. If 3000 is taken it will pick another port.

You should see **Eye of Grok**. On Logan's Mac the live URL is [http://localhost:3002](http://localhost:3002). Use **Live** (Casey POSTs to `/api/local/snapshot`) or **Edit** to add bots and group chats from the Grok Bot sidebar. Cloud MCP cannot reach localhost — details in [LOCAL.md](LOCAL.md).

## Push your work

```bash
git checkout -b your-name/short-topic
# edit, commit
git push -u origin HEAD
```

Do not commit `.env.local`, `data/`, or API keys. `.env.example` is the only env file in git.

## What to read

1. [OVERVIEW.md](OVERVIEW.md) — full project picture
2. [README.md](README.md) — start at [How it works (end to end)](README.md#how-it-works-end-to-end), then keys / API
3. [ARCHITECTURE.md](ARCHITECTURE.md) — file map
4. [DEMO.md](DEMO.md) — 90-second walkthrough

## What not to do this weekend

- Do not wire unofficial Grok Bot CLIs or session cookies.
- Do not implement live hide/delete against Grok Bot.
- Do not turn Analyze back on unless someone adds an xAI key and the team agrees.

## Ingest tokens

On this Mac, `POST /api/local/snapshot` needs no token and writes Logan's `mine` map.

Elsewhere:

- Claim a slug on the home page. If `logan` is taken, offer `logan1`. **Copy Chief of Staff message** embeds `POST /api/orgs/<slug>/snapshot` plus that org's `eog_…` token. Maps are public; only the write token is secret.
- Logan's `/u/mine` still uses `INGEST_TOKEN` (local default `hackathon-demo`).
- MCP writes (`/api/mcp`) must send **that org's** bearer. The token cannot push a different org.
- Rotate a leaked claimed-org token: `POST /api/orgs/<slug>/rotate` with the current bearer. Rotate `mine` by changing `INGEST_TOKEN`.

On Vercel, set `DATABASE_URL` (Neon) so maps survive serverless instances. `GET /api/health` reports `{ driver, durable }`.
