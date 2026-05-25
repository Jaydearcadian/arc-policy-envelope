import test from "node:test";
import assert from "node:assert/strict";

import { allowedRequest, demoEnvelope, deniedRequest, evaluateEnvelope } from "../src/index.js";

test("evaluateEnvelope allows requests inside the envelope", () => {
  const result = evaluateEnvelope(demoEnvelope, allowedRequest, "2026-05-23T12:00:01.000Z");
  assert.equal(result.status, "allowed");
  assert.deepEqual(result.reasons, ["All envelope rules passed."]);
  assert.match(result.policyHash, /^0x[a-f0-9]{64}$/);
  assert.match(result.requestHash, /^0x[a-f0-9]{64}$/);
  assert.match(result.approvalHash, /^0x[a-f0-9]{64}$/);
});

test("evaluateEnvelope allows first-period zero spend", () => {
  const result = evaluateEnvelope(demoEnvelope, { ...allowedRequest, spentInPeriod: "0" }, "2026-05-23T12:00:01.000Z");
  assert.equal(result.status, "allowed");
});

test("evaluateEnvelope denies over-limit requests", () => {
  const result = evaluateEnvelope(demoEnvelope, deniedRequest, "2026-05-23T12:00:01.000Z");
  assert.equal(result.status, "denied");
  assert.match(result.reasons.join("\n"), /exceeds max per action/);
  assert.match(result.reasons.join("\n"), /period spend/);
  assert.match(result.denialHash, /^0x[a-f0-9]{64}$/);
});

test("evaluateEnvelope denies disallowed actors and targets", () => {
  const result = evaluateEnvelope(demoEnvelope, {
    ...allowedRequest,
    actorId: "agent_untrusted",
    target: { kind: "recipient", recipientId: "recipient_unknown" }
  }, "2026-05-23T12:00:01.000Z");
  assert.equal(result.status, "denied");
  assert.match(result.reasons.join("\n"), /actor agent_untrusted/);
  assert.match(result.reasons.join("\n"), /recipient recipient_unknown/);
});

test("evaluateEnvelope denies unknown runtime target kinds", () => {
  const result = evaluateEnvelope(demoEnvelope, {
    ...allowedRequest,
    target: { kind: "wallet", walletId: "attacker" } as never
  }, "2026-05-23T12:00:01.000Z");
  assert.equal(result.status, "denied");
  assert.match(result.reasons.join("\n"), /target kind is invalid/);
});

test("evaluateEnvelope denies out-of-window requests", () => {
  const result = evaluateEnvelope({
    ...demoEnvelope,
    schedule: { days: ["mon"], startHourUtc: 9, endHourUtc: 17 }
  }, {
    ...allowedRequest,
    requestedAt: "2026-05-23T12:00:00.000Z"
  }, "2026-05-23T12:00:01.000Z");
  assert.equal(result.status, "denied");
  assert.match(result.reasons.join("\n"), /outside the allowed schedule/);
});

test("evaluateEnvelope denies malformed non-array schedule days", () => {
  const result = evaluateEnvelope({
    ...demoEnvelope,
    schedule: { ...demoEnvelope.schedule, days: "sat" as never }
  }, allowedRequest, "2026-05-23T12:00:01.000Z");
  assert.equal(result.status, "denied");
  assert.match(result.reasons.join("\n"), /schedule\.days must be an array/);
});

test("evaluateEnvelope rejects zero amount requests", () => {
  const result = evaluateEnvelope(demoEnvelope, { ...allowedRequest, amount: "0" }, "2026-05-23T12:00:01.000Z");
  assert.equal(result.status, "denied");
  assert.match(result.reasons.join("\n"), /greater than zero/);
});
