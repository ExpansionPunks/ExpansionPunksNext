import { test } from "node:test";
import assert from "node:assert/strict";
import { selectWalletOptions, walletName } from "./wallet-options.ts";

const mm = { id: "io.metamask", name: "MetaMask", icon: "data:mm" };
const phantom = { id: "app.phantom", name: "Phantom", icon: "data:ph" };
const injected = { id: "injected", name: "Injected" };

test("dedups connectors by id, preserving order", () => {
  const out = selectWalletOptions([mm, mm, phantom]);
  assert.deepEqual(out.map((o) => o.id), ["io.metamask", "app.phantom"]);
});

test("drops the generic injected connector when a real wallet is present", () => {
  const out = selectWalletOptions([injected, mm]);
  assert.deepEqual(out.map((o) => o.id), ["io.metamask"]);
});

test("keeps the generic injected connector as the lone fallback", () => {
  const out = selectWalletOptions([injected]);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, "Browser wallet");
});

test("passes the connector reference and icon through", () => {
  const out = selectWalletOptions([mm]);
  assert.equal(out[0].connector, mm);
  assert.equal(out[0].icon, "data:mm");
});

test("normalizes known wallet names", () => {
  assert.equal(walletName("Rabby"), "Rabby Wallet");
  assert.equal(walletName("Injected"), "Browser wallet");
  assert.equal(walletName("MetaMask"), "MetaMask");
});
