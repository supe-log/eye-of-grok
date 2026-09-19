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

You should see **Eye of Grok** and a single node, **Logan**. Use **Edit** to add the bots and group chats from the Grok Bot sidebar.

## Push your work

```bash
git checkout -b your-name/short-topic
# edit, commit
git push -u origin HEAD
```

Do not commit `.env.local`, `data/`, or API keys. `.env.example` is the only env file in git.

## What to read

1. [OVERVIEW.md](OVERVIEW.md) — full project picture
2. [README.md](README.md) — run + API
3. [ARCHITECTURE.md](ARCHITECTURE.md) — model and file map
4. [DEMO.md](DEMO.md) — 30-second walkthrough
5. [PITCH.md](PITCH.md) — five-slide demo deck (`/pitch`)

## What not to do this weekend

- Do not wire unofficial Grok Bot CLIs or session cookies.
- Do not implement live hide/delete against Grok Bot.
- Do not turn Analyze back on unless someone adds an xAI key and the team agrees.

## Ingest token

Local default: `hackathon-demo`. Same header for `POST /api/orgs/mine/snapshot` and `/api/mcp`.
