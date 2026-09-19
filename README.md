# Eye of Grok

A visualizer for **your** Grok Bot setup: bots, group spaces, and the lines between them.

Analyze / lean-up is parked. No xAI key required.

Repo: [github.com/supe-log/eye-of-grok](https://github.com/supe-log/eye-of-grok)

- **Full overview (start here):** [OVERVIEW.md](OVERVIEW.md)
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- Teammates (clone / push): [TEAM.md](TEAM.md)
- Demo walkthrough: [DEMO.md](DEMO.md)
- Pitch (five slides): [PITCH.md](PITCH.md) · live `/pitch`

## Run

```bash
npm install
npm run dev
```

Open the URL Next prints (often [http://localhost:3000](http://localhost:3000)). You start as Logan. Add Bots and spaces from **Edit**.

Grok Bot has no official roster export. Type names from your sidebar. A Chief of Staff can also `POST` a snapshot later.

## API

| Method | Path | Auth | What |
| --- | --- | --- | --- |
| GET | `/api/orgs/mine` | no | Current map (seeds a starter) |
| GET | `/api/orgs/mine?reset=1` | no | Back to Logan-only starter |
| POST | `/api/orgs/mine/snapshot` | Bearer | Replace the graph |
| GET | `/api/orgs/mine/mermaid` | no | Flowchart export |
| GET/POST | `/api/mcp` | Bearer on writes | `push_org_snapshot`, `get_org_view` |

Default ingest token: `hackathon-demo`.
