# Teammate handoff

Repo: https://github.com/supe-log/eye-of-grok  
You have **Write** (push). The owner is `supe-log`.

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
2. [README.md](README.md) — product, architecture, keys, API
3. [ARCHITECTURE.md](ARCHITECTURE.md) — file map
4. [DEMO.md](DEMO.md) — 90-second walkthrough

## What not to do this weekend

- Do not wire unofficial Grok Bot CLIs or session cookies.
- Do not implement live hide/delete against Grok Bot.
- Do not turn Analyze back on unless someone adds an xAI key and the team agrees.

## Ingest token

On this Mac, `POST /api/local/snapshot` needs no token. Elsewhere: `hackathon-demo` on `POST /api/orgs/mine/snapshot` and `/api/mcp`.
