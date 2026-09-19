# Demo script

1. Open [http://localhost:3002](http://localhost:3002). Type a name and **Copy Chief of Staff message** (claims the slug + unique token), or open [Logan May's demo](http://localhost:3002/u/mine).
2. Paste that message into the account's Chief of Staff (any device once the site is public). It POSTs to `/api/orgs/<slug>/snapshot` with **that org's** bearer. The map redraws within 2.5s.
3. Or **Edit** → add Chief of Staff (reports to you), then specialists, then a group space.
4. Click a node to inspect. Mark one **stale** or **hidden**, toggle **Flag stale**.
5. Open **Mermaid** and copy the export if you want it in a chat.
