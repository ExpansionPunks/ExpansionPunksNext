import { test } from "node:test";
import assert from "node:assert/strict";
import { lookupParticipation, participationTreeMatches } from "./participation-proof.ts";

const MERKLE = {
  leaves: [
    { address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", amountWei: "1000000000000000", proof: ["0xabc"] },
    { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", amountWei: "2000000000000000", proof: [] },
  ],
};

test("finds a leaf by exact address", () => {
  const r = lookupParticipation(MERKLE, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  assert.equal(r.amountWei, "1000000000000000");
  assert.deepEqual(r.proof, ["0xabc"]);
});

test("matches case-insensitively (lowercased connected address)", () => {
  const r = lookupParticipation(MERKLE, "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
  assert.equal(r.amountWei, "1000000000000000");
});

test("returns null for an address not in the tree", () => {
  assert.equal(lookupParticipation(MERKLE, "0x000000000000000000000000000000000000dEaD"), null);
});

const TREE = { root: "0x" + "ab".repeat(32), poolWei: "3000", leaves: [] };

test("accepts only proof metadata matching the deployed contract", () => {
  assert.equal(participationTreeMatches(TREE, TREE.root, 3000n), true);
  assert.equal(participationTreeMatches(TREE, "0x" + "cd".repeat(32), 3000n), false);
  assert.equal(participationTreeMatches(TREE, TREE.root, 2999n), false);
});
