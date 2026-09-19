# Eye of Grok — project overview

Read this file first. It is the high-level picture of the hackathon project. Details live in [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md), [DEMO.md](DEMO.md), and [TEAM.md](TEAM.md).

**How the product actually works:** [README — How it works (end to end)](README.md#how-it-works-end-to-end). That section is the claim → CoS → `/u/slug` loop and the PR → `main` → deploy loop. Read it before the API tables.

Repo: [github.com/supe-log/eye-of-grok](https://github.com/supe-log/eye-of-grok)

## One sentence

Eye of Grok is a visualizer for **your** Grok Bot company: bots, group spaces, and the lines between them. Humans (or a Chief of Staff Bot) write the graph. The site draws it. It does not hide or delete real Bots.

## Why we are building it (hackathon)

Grok Bot scales like a company. You get named teammates, group chats, per-bot memory, and one shared computer. Official limits that matter:

- About **50** Bots + group spaces per account (a ceiling, not a target).
- Group chats are **2–6** Bots. Over six is over cap.
- **Hide ≠ pause.** Hidden Bots still run routines.
- **Delete** drops profile, conversation, and routines. Files on the shared computer remain.
- **Duplicate** copies profile, not memory. “General helper” is the anti-pattern.

xAI left coordination to a Chief of Staff and did not ship an org dashboard. There is **no official roster API**. The CoS can see the mess. Humans cannot. This site is the map you wish the sidebar was.

Event framing: Cursor Austin × AITX / Grok Hackathon. The MVP on the floor is the **map you can edit**. Grok 4.6 analyze / lean-up exists in code and is **parked** (no xAI key, UI hidden) until the team turns it back on.

## What you see when you run it

1. Open the app. You start as a single node, **Logan**.
2. Use **Edit** to add the Chief of Staff, specialists, and group spaces from your Grok Bot sidebar. There is no live import. Type names.
3. Click a node to inspect. Mark one **stale** or **hidden**. Toggle **Flag stale**.
4. Open **Mermaid** if you want the graph in a chat.
5. **Connect** is how a Chief of Staff later pushes the same graph over REST or MCP.

Do not look for Analyze in the UI this weekend unless the team agrees and an xAI key is present.

## What is in / not in the MVP

| Now | Parked |
| --- | --- |
| Interactive canvas org map | Grok 4.6 analyze / lean-up (code exists, UI hidden) |
| Edit bots and spaces in the browser | Live import from the Grok Bot app |
| Status colors + Flag stale | Hide/delete against real Grok Bot |
| Mermaid export | Multi-tenant / many humans |
| REST + MCP ingest, per-slug claim + unique write tokens | Required xAI key |

Default **demo** org id is `mine` (Logan). Everyone else claims `/u/<slug>` (`logan` taken → offer `logan1`). Maps are public to browse. Live maps persist in Neon (`org_snapshots` + revision history). Local fallback without `DATABASE_URL` is `data/orgs/` (gitignored).

## Data model (source of truth)

JSON snapshot, not Mermaid.

- **Nodes:** `bot` | `group` | `human`
- **Status:** `active` | `stale` | `hidden` | `deprecated` | `duplicate`
- **Edges:** `reports_to` | `member_of` | `handoff` | `shares_context`

Do not store transcripts or raw memory. The map is a **claimed** org. If the Chief of Staff never saw a hidden Bot, it will not appear.

## How pieces talk

Human in the UI (Edit or paste JSON) and the Chief of Staff (`POST` snapshot or MCP) hit the Next.js API. The API writes that **slug's** record (`{ slug, tokenHash, snapshot }`) in Neon and appends a revision. The canvas map and Mermaid export both read the latest snapshot.

Writes to a claimed org need `Authorization: Bearer <that org's token>`. Logan's `/u/mine` uses `INGEST_TOKEN` (local default `hackathon-demo`). Loopback `/api/local/snapshot` stays token-free and still writes `mine`.

## Product rules we are not breaking

- Hide ≠ pause.
- Delete ≠ wipe the shared computer.
- Duplicate copies profile, not memory.
- Tools/computer are account-level. Memory is per Bot.
- Never auto-delete a real Bot from this app.
- Do not wire unofficial Grok Bot CLIs or session cookies this weekend.

## Stack

Next.js 16, React 19, Tailwind 4, canvas DAG, dagre, Mermaid, Zod, MCP SDK, Neon. No Supabase. No xAI key for the visualizer MVP.

## Where to go next

| If you want… | Read |
| --- | --- |
| Clone, run, push | [TEAM.md](TEAM.md) |
| File map and request flow | [ARCHITECTURE.md](ARCHITECTURE.md) |
| 30-second walkthrough | [DEMO.md](DEMO.md) |
| API table | [README.md](README.md) |
