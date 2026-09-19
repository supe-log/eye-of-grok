import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import type * as Store from "./store";

const dataDir = mkdtempSync(path.join(tmpdir(), "eog-store-"));
process.env.EYE_OF_GROK_DATA_DIR = dataDir;
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.DATABASE_URL;
delete process.env.VERCEL;

const snapshotBody = {
  source: "chief_of_staff" as const,
  nodes: [
    {
      id: "human-you",
      kind: "human" as const,
      name: "Ada",
      title: "You",
      status: "active" as const,
    },
    {
      id: "bot-cos",
      kind: "bot" as const,
      name: "Casey",
      title: "Chief of Staff",
      status: "active" as const,
    },
  ],
  edges: [
    {
      id: "e-1",
      from: "bot-cos",
      to: "human-you",
      kind: "reports_to" as const,
    },
  ],
};

describe("per-org store", () => {
  let store: typeof Store;

  before(async () => {
    store = await import("./store");
    await store.ensureMineOrg();
  });

  after(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("uses the filesystem driver when Neon and Blob are unset", () => {
    assert.deepEqual(store.getStoreInfo(), { driver: "filesystem", durable: false });
  });

  it("claims a unique slug and isolates writes", async () => {
    const first = await store.claimOrg({ name: "Ada Lovelace" });
    assert.equal(first.ok, true);
    assert.equal(first.ok && first.created, true);
    if (!first.ok || !first.created) throw new Error("expected create");

    const second = await store.claimOrg({ name: "Ada Lovelace" });
    assert.equal(second.ok && second.created, false);

    const saved = await store.upsertOrg("ada-lovelace", snapshotBody, "chief_of_staff");
    assert.equal(saved.orgId, "ada-lovelace");
    assert.equal(saved.nodes.length, 2);

    const mine = await store.getOrg("mine");
    assert.ok(mine);
    assert.equal(mine.orgId, "mine");
    assert.notEqual(mine.nodes.length, saved.nodes.length);

    assert.equal(await store.verifyOrgToken("ada-lovelace", first.token), true);
    assert.equal(await store.verifyOrgToken("ada-lovelace", "hackathon-demo"), false);
    assert.equal(await store.verifyOrgToken("mine", first.token), false);
    assert.equal(await store.verifyOrgToken("mine", "hackathon-demo"), true);
  });

  it("rejects writes to an unclaimed slug", async () => {
    await assert.rejects(
      () => store.upsertOrg("nobody-here", snapshotBody, "chief_of_staff"),
      /org_not_claimed/,
    );
  });

  it("rotates a claimed org token", async () => {
    const claimed = await store.claimOrg({ name: "Rotate Me" });
    if (!claimed.ok || !claimed.created) throw new Error("expected create");
    const next = await store.rotateOrgToken("rotate-me");
    assert.equal(await store.verifyOrgToken("rotate-me", claimed.token), false);
    assert.equal(await store.verifyOrgToken("rotate-me", next), true);
  });

  it("offers logan1 when logan is taken", async () => {
    const first = await store.claimOrg({ name: "Logan" });
    assert.equal(first.ok && first.created, true);
    const suggestions = await store.suggestAvailableOrgIds("logan");
    assert.equal(suggestions[0], "logan1");
    const alt = await store.claimOrg({ name: "Logan", orgId: suggestions[0] });
    assert.equal(alt.ok && alt.created, true);
    if (!alt.ok || !alt.created) throw new Error("expected logan1");
    assert.equal(alt.orgId, "logan1");
  });

  it("lists a public gallery without tokens", async () => {
    await store.claimOrg({ name: "Anon User", orgId: "anon-user", anonymous: true });
    const cards = await store.listGallery();
    const mine = cards.find((card) => card.orgId === "mine");
    const anon = cards.find((card) => card.orgId === "anon-user");
    assert.ok(mine);
    assert.equal(mine.demo, true);
    assert.ok(anon);
    assert.equal(anon.label, "Anonymous layout");
    assert.equal(anon.anonymous, true);
    assert.equal("token" in anon, false);
    assert.equal("tokenHash" in anon, false);
  });
});
