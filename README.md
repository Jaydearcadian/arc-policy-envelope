# Arc Policy Envelope

Composable spend boundaries for Arc-native apps and autonomous agents.

Arc Policy Envelope is a small TypeScript primitive for defining, hashing, and evaluating value-movement rules before USDC or EURC can move on Arc. It gives Arc builders a forkable policy layer for agents, apps, wallets, and operator workflows that should never receive blank-check spending power.

## What it enables

- **Bounded agent bankrolls**: cap how much a market or trading agent can request per action and per period.
- **Per-action USDC controls**: enforce max amount before payment or escrow execution.
- **Recipient and venue allowlists**: limit where an app or agent can direct value.
- **Schedule windows**: allow actions only during configured UTC days and hours.
- **Policy evidence for proofs**: emit `policyHash` and `approvalHash` for downstream `ProofOfPayable.policy` refs.
- **Safer Arc apps**: separate “agent decided” from “money is allowed to move.”

## Why Arc

Arc is USDC-native and EVM-compatible, which makes it a natural rail for programmable payments and agent settlement flows. This primitive is designed for Arc-style payment objects:

- `network`: `arc-testnet` or `arc-mainnet`
- `asset`: `USDC` or `EURC`
- decimal amounts use stablecoin precision up to 6 decimals
- outputs are deterministic and portable across services

This package does not submit transactions, custody keys, call RPC endpoints, or perform onchain authorization. It only defines, hashes, and evaluates policy envelopes.

## How it composes

```text
Agent Request
  -> Arc Policy Envelope evaluation
  -> allowed/denied decision
  -> policyHash + approvalHash
  -> Arc Proof of Payable PolicyRef
```

When an evaluation is allowed, the output can feed `arc-proof-of-payable`:

```ts
policy: {
  envelopeId: evaluation.envelopeId,
  policyHash: evaluation.policyHash,
  approvalHash: evaluation.approvalHash,
  approval: {
    version: evaluation.version,
    status: evaluation.status,
    requestId: evaluation.requestId,
    requestHash: evaluation.requestHash,
    evaluatedAt: evaluation.evaluatedAt,
    reasons: evaluation.reasons,
    request,
    envelope
  }
}
```

Denied evaluations emit `denialHash` and reasons instead.

## SDK example

```ts
import { allowedRequest, demoEnvelope, evaluateEnvelope } from "arc-policy-envelope";

const evaluation = evaluateEnvelope(demoEnvelope, allowedRequest);

if (evaluation.status === "allowed") {
  console.log(evaluation.policyHash);
  console.log(evaluation.approvalHash);
} else {
  console.log(evaluation.reasons);
}
```

## API

Build and start the local API:

```bash
npm run build
npm start
```

The server binds to `127.0.0.1` and defaults to:

```text
http://127.0.0.1:8788
```

Endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | API health check. |
| `POST` | `/envelopes/hash` | Return `policyHash` for an envelope. |
| `POST` | `/requests/hash` | Return `requestHash` for a request. |
| `POST` | `/evaluations/hash` | Return hash for an evaluation object. |
| `POST` | `/envelopes/evaluate` | Return allowed/denied evaluation and `policyRef` when allowed. |

Example:

```bash
curl -s http://127.0.0.1:8788/envelopes/evaluate \
  -H 'content-type: application/json' \
  -d '{"envelope": { "...": "..." }, "request": { "...": "..." }}'
```

If `evaluatedAt` is omitted, the API falls back to `request.requestedAt` so repeated calls with the same input remain deterministic.

## Showcase

After `npm start`, open:

```text
http://127.0.0.1:8788
```

The showcase displays:

- sample Arc policy envelope
- allowed and denied agent request scenarios
- `policyHash`
- `requestHash`
- `approvalHash` or `denialHash`
- `PolicyRef` output for allowed evaluations

It is a local demo only. It does not custody keys, call RPC endpoints, or submit transactions.

## Core rules

The v1 evaluator checks:

| Rule | Meaning |
| --- | --- |
| Asset | Request network and asset must match the envelope. |
| Amount | Request amount must be greater than zero and not exceed max per action. |
| Period cap | Request amount plus already-spent amount must not exceed period cap. |
| Actor | Requesting actor must be allowlisted. |
| Target | Recipient or venue must be allowlisted. |
| Schedule | Request timestamp must fall inside configured UTC day/hour window. |

## Repository structure

```text
src/
  types.ts       envelope, request, and evaluation types
  canonical.ts   deterministic JSON serialization
  hash.ts        policy/request/evaluation hash helpers
  evaluate.ts    evaluator
  api.ts         local HTTP handler
  server.ts      local HTTP server
  examples.ts    typed sample envelope and requests
public/
  *.html/css/js  static local showcase
examples/
  *.json         standalone example inputs and outputs
test/
  *.test.ts      node:test coverage
```

## Commands

```bash
npm install
npm run typecheck
npm test
npm run build
npm start
npm pack --dry-run .
```

## Relationship to Microcosm

Microcosm is the reference product path:

```text
Identity -> Policy Envelope -> Agent Intent -> Settlement/Receipt -> Proof of Payable
```

Other Arc builders can use this primitive independently without adopting Microcosm.

## Arc OSS fit

This package is intended as a reusable Arc OSS primitive rather than a full application. It complements Circle `arc-*` reference apps by providing the policy evidence layer those apps can call before payment, escrow, commerce, or agent settlement code touches wallets or RPC.

Submission-ready surfaces:

- SDK functions for hashing and evaluating policy envelopes.
- Local JSON API for app or agent guardrail checks.
- Static showcase for allowed and denied Arc payment requests.
- Example envelope/request JSON fixtures.
- Tests for deterministic hashing, malformed policy rejection, API behavior, and showcase serving.

## Hermes and multi-agent experiments

Hermes-style agents can call the API as a guardrail before downstream settlement logic:

```text
Agent proposal -> Policy Envelope API -> allowed PolicyRef -> Proof of Payable -> settlement path
```

The important boundary is that the policy API only emits deterministic evidence. Another system must still handle signatures, balances, approvals, RPC submission, confirmations, and failure handling.

## Non-goals

- No private key management.
- No wallet custody.
- No RPC calls.
- No onchain writes.
- No production authorization system.
- No prediction-market or trading venue integration.
- No optional-field policy soup.
