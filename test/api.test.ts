import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

import { handleRequest } from "../src/api.js";
import { allowedRequest, demoEnvelope, deniedRequest } from "../src/examples.js";

const withServer = async (run: (baseUrl: string) => Promise<void>) => {
  const server = createServer(handleRequest);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.equal(typeof address, "object");
  assert.ok(address);
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
};

test("api evaluates allowed and denied envelope requests", async () => {
  await withServer(async (baseUrl) => {
    const allowed = await fetch(`${baseUrl}/envelopes/evaluate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ envelope: demoEnvelope, request: allowedRequest, evaluatedAt: "2026-05-23T12:00:01.000Z" })
    });
    assert.equal(allowed.status, 200);
    const allowedBody = await allowed.json() as {
      evaluation: { status: string; requestHash: string };
      policyRef: { approval: { status: string; requestHash: string; request: { id: string }; envelope: { id: string } } };
    };
    assert.equal(allowedBody.evaluation.status, "allowed");
    assert.ok(allowedBody.policyRef);
    assert.equal(allowedBody.policyRef.approval.status, "allowed");
    assert.equal(allowedBody.policyRef.approval.requestHash, allowedBody.evaluation.requestHash);
    assert.equal(allowedBody.policyRef.approval.request.id, allowedRequest.id);
    assert.equal(allowedBody.policyRef.approval.envelope.id, demoEnvelope.id);

    const denied = await fetch(`${baseUrl}/envelopes/evaluate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ envelope: demoEnvelope, request: deniedRequest, evaluatedAt: "2026-05-23T12:00:01.000Z" })
    });
    assert.equal(denied.status, 200);
    const deniedBody = await denied.json() as { evaluation: { status: string }; policyRef: unknown };
    assert.equal(deniedBody.evaluation.status, "denied");
    assert.equal(deniedBody.policyRef, null);
  });
});

test("api hashes envelope, request, and evaluation", async () => {
  await withServer(async (baseUrl) => {
    for (const [path, body, key] of [
      ["/envelopes/hash", { envelope: demoEnvelope }, "policyHash"],
      ["/requests/hash", { request: allowedRequest }, "requestHash"]
    ] as const) {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      assert.equal(response.status, 200);
      assert.match((await response.json() as Record<string, string>)[key], /^0x[a-f0-9]{64}$/);
    }
  });
});

test("api serves the static showcase", async () => {
  await withServer(async (baseUrl) => {
    const home = await fetch(`${baseUrl}/`);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Arc Policy Envelope/);

    const app = await fetch(`${baseUrl}/app.js`);
    assert.equal(app.status, 200);
    assert.match(await app.text(), /envelopes\/evaluate/);
  });
});

test("api produces deterministic evaluation when evaluatedAt is omitted", async () => {
  await withServer(async (baseUrl) => {
    const body = JSON.stringify({ envelope: demoEnvelope, request: allowedRequest });
    const first = await fetch(`${baseUrl}/envelopes/evaluate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body
    });
    const second = await fetch(`${baseUrl}/envelopes/evaluate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body
    });
    assert.deepEqual(await first.json(), await second.json());
  });
});

test("api denies malformed non-array allowlists", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/envelopes/evaluate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        envelope: {
          ...demoEnvelope,
          target: { ...demoEnvelope.target, allowedVenueIds: "venue_prediction_market_demo" }
        },
        request: allowedRequest
      })
    });
    assert.equal(response.status, 200);
    const payload = await response.json() as { evaluation: { status: string; reasons: string[] }; policyRef: unknown };
    assert.equal(payload.evaluation.status, "denied");
    assert.equal(payload.policyRef, null);
    assert.match(payload.evaluation.reasons.join("\n"), /allowedVenueIds must be an array/);
  });
});

test("api returns deterministic 413 for oversized bodies", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/envelopes/evaluate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ padding: "x".repeat(300_000) })
    });
    assert.equal(response.status, 413);
  });
});
