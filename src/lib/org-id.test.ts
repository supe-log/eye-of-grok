import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  displayNameFromOrgId,
  isClaimableOrgId,
  isReservedOrgId,
  isValidOrgId,
  normalizeOrgId,
  numberedOrgId,
} from "./org-id";

describe("org-id", () => {
  it("slugs a human name", () => {
    assert.equal(normalizeOrgId("Logan May"), "logan-may");
    assert.equal(normalizeOrgId("  Ada_Lovelace!! "), "ada-lovelace");
  });

  it("rejects short or invalid ids", () => {
    assert.equal(isValidOrgId("a"), false);
    assert.equal(isValidOrgId("logan-may"), true);
  });

  it("reserves mine and system slugs", () => {
    assert.equal(isReservedOrgId("mine"), true);
    assert.equal(isClaimableOrgId("mine"), false);
    assert.equal(isClaimableOrgId("logan-may"), true);
  });

  it("title-cases a slug", () => {
    assert.equal(displayNameFromOrgId("logan-may"), "Logan May");
  });

  it("numbers a taken slug", () => {
    assert.equal(numberedOrgId("logan", 1), "logan1");
    assert.equal(numberedOrgId("logan-may", 2), "logan-may2");
  });
});
