# Contributing

Repo: https://github.com/supe-log/eye-of-grok

## Clone and run

```bash
git clone https://github.com/supe-log/eye-of-grok.git
cd eye-of-grok
npm install
npm run dev
```

Open the URL Next prints. If port 3000 is taken it will pick another (local demo often lands on [http://localhost:3002](http://localhost:3002)).

Home is the share page. Demo map: `/u/mine`. Use **Live** to let a Bot POST to `/api/local/snapshot`, or **Edit** to type bots and group chats from the Grok Bot sidebar. Cloud MCP cannot reach localhost — details in [LOCAL.md](LOCAL.md).

## Push your work

```bash
git checkout -b your-name/short-topic
# edit, commit
git push -u origin HEAD
```

Do not commit `.env.local`, `data/`, or API keys. `.env.example` is the only env file in git.

## What to read

1. [OVERVIEW.md](OVERVIEW.md) — product picture
2. [README.md](README.md) — setup, keys, API
3. [ARCHITECTURE.md](ARCHITECTURE.md) — file map
4. [DEMO.md](DEMO.md) — short walkthrough

## Out of scope

These stay out of the product on purpose:

- Unofficial Grok Bot CLIs or session cookies
- Live hide/delete against a real Grok Bot account
- Turning the Analyze UI back on unless an xAI key is configured (the API exists; the UI is parked)

## Ingest token

`POST /api/local/snapshot` on loopback needs no token. Off this machine, send `Authorization: Bearer <INGEST_TOKEN>` (default `hackathon-demo`) on `POST /api/orgs/:id/snapshot` and `/api/mcp`.
