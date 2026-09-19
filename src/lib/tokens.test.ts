import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashToken, mintIngestToken, secretsEqual } from "./tokens";

describe("tokens", () => {
  it("mints unique eog_ secrets", () => {
    const a = mintIngestToken();
    const b = mintIngestToken();
    assert.match(a, /^eog_/);
    assert.notEqual(a, b);
  });

  it("hashes stably and compares in constant time", () => {
    const token = "eog_test-token";
    assert.equal(hashToken(token), hashToken(token));
    assert.equal(secretsEqual(hashToken(token), hashToken(token)), true);
    assert.equal(secretsEqual(hashToken(token), hashToken("other")), false);
  });
});
