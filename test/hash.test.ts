import test from "node:test";
import assert from "node:assert/strict";

import { demoEnvelope, hashEnvelope, hashRequest, allowedRequest } from "../src/index.js";

test("hashEnvelope is deterministic for equivalent content", () => {
  assert.equal(hashEnvelope(demoEnvelope), hashEnvelope({ ...demoEnvelope }));
});

test("hashRequest changes when request amount changes", () => {
  assert.notEqual(hashRequest(allowedRequest), hashRequest({ ...allowedRequest, amount: "21.00" }));
});
