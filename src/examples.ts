import type { EvaluationRequest, PolicyEnvelope } from "./types.js";
import { evaluateEnvelope } from "./evaluate.js";

export const demoEnvelope: PolicyEnvelope = {
  version: "envelope.v1",
  id: "env_arc_market_agent_001",
  name: "Market agent bankroll envelope",
  actor: {
    allowedActorIds: ["agent_market_researcher"],
    grantMode: "hard"
  },
  asset: {
    network: "arc-testnet",
    asset: "USDC"
  },
  amount: {
    maxPerAction: "25.00",
    maxPerPeriod: "100.00",
    period: "day"
  },
  target: {
    allowedRecipientIds: ["recipient_research_desk"],
    allowedVenueIds: ["venue_prediction_market_demo"]
  },
  schedule: {
    days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    startHourUtc: 0,
    endHourUtc: 24
  },
  createdAt: "2026-05-23T00:00:00.000Z"
};

export const allowedRequest: EvaluationRequest = {
  version: "request.v1",
  id: "req_market_agent_001",
  payerId: "org_microcosm_demo",
  actorId: "agent_market_researcher",
  asset: "USDC",
  network: "arc-testnet",
  amount: "20.00",
  reason: "Market agent bankroll request",
  target: { kind: "venue", venueId: "venue_prediction_market_demo" },
  requestedAt: "2026-05-23T12:00:00.000Z",
  spentInPeriod: "10.00"
};

export const deniedRequest: EvaluationRequest = {
  version: "request.v1",
  id: "req_market_agent_002",
  payerId: "org_microcosm_demo",
  actorId: "agent_market_researcher",
  asset: "USDC",
  network: "arc-testnet",
  amount: "125.00",
  reason: "Oversized market agent bankroll request",
  target: { kind: "venue", venueId: "venue_prediction_market_demo" },
  requestedAt: "2026-05-23T12:00:00.000Z",
  spentInPeriod: "10.00"
};

export const allowedEvaluation = evaluateEnvelope(demoEnvelope, allowedRequest, "2026-05-23T12:00:01.000Z");
export const deniedEvaluation = evaluateEnvelope(demoEnvelope, deniedRequest, "2026-05-23T12:00:01.000Z");
