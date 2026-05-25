import { hashBytes, hashEnvelope, hashRequest } from "./hash.js";
import type { EvaluationRequest, PolicyEnvelope, PolicyEvaluation, Weekday } from "./types.js";

const DECIMAL_6 = /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/;
const WEEKDAYS: Weekday[] = ["sun" as Weekday, "mon", "tue", "wed", "thu", "fri", "sat"];

const parseAmount = (value: string, field: string, allowZero = false): bigint | string => {
  if (!DECIMAL_6.test(value)) return `${field} must be a positive decimal string with at most 6 decimals`;
  const [whole, fraction = ""] = value.split(".");
  const units = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
  return units > 0n || allowZero ? units : `${field} must be greater than zero`;
};

const isWithinSchedule = (envelope: PolicyEnvelope, requestedAt: string): boolean => {
  const date = new Date(requestedAt);
  if (Number.isNaN(date.getTime())) return false;
  const day = WEEKDAYS[date.getUTCDay()];
  const hour = date.getUTCHours();
  if (!envelope.schedule.days.includes(day)) return false;
  const { startHourUtc, endHourUtc } = envelope.schedule;
  if (startHourUtc === endHourUtc) return false;
  if (startHourUtc < endHourUtc) return hour >= startHourUtc && hour < endHourUtc;
  return hour >= startHourUtc || hour < endHourUtc;
};

const evaluateReasons = (envelope: PolicyEnvelope, request: EvaluationRequest): string[] => {
  const reasons: string[] = [];
  const amount = parseAmount(request.amount, "request.amount");
  const spent = parseAmount(request.spentInPeriod, "request.spentInPeriod", true);
  const maxPerAction = parseAmount(envelope.amount.maxPerAction, "envelope.amount.maxPerAction");
  const maxPerPeriod = parseAmount(envelope.amount.maxPerPeriod, "envelope.amount.maxPerPeriod");

  if (typeof amount === "string") reasons.push(amount);
  if (typeof spent === "string") reasons.push(spent);
  if (typeof maxPerAction === "string") reasons.push(maxPerAction);
  if (typeof maxPerPeriod === "string") reasons.push(maxPerPeriod);

  if (request.network !== envelope.asset.network) reasons.push(`network ${request.network} is not allowed`);
  if (request.asset !== envelope.asset.asset) reasons.push(`asset ${request.asset} is not allowed`);
  if (!Array.isArray(envelope.actor.allowedActorIds)) {
    reasons.push("actor.allowedActorIds must be an array");
  } else if (!envelope.actor.allowedActorIds.includes(request.actorId)) {
    reasons.push(`actor ${request.actorId} is not allowed`);
  }

  if (request.target.kind === "recipient") {
    if (!Array.isArray(envelope.target.allowedRecipientIds)) {
      reasons.push("target.allowedRecipientIds must be an array");
    } else if (!envelope.target.allowedRecipientIds.includes(request.target.recipientId)) {
      reasons.push(`recipient ${request.target.recipientId} is not allowed`);
    }
  } else if (request.target.kind === "venue") {
    if (!Array.isArray(envelope.target.allowedVenueIds)) {
      reasons.push("target.allowedVenueIds must be an array");
    } else if (!envelope.target.allowedVenueIds.includes(request.target.venueId)) {
      reasons.push(`venue ${request.target.venueId} is not allowed`);
    }
  } else {
    reasons.push("target kind is invalid");
  }

  if (typeof amount === "bigint" && typeof maxPerAction === "bigint" && amount > maxPerAction) {
    reasons.push(`amount ${request.amount} exceeds max per action ${envelope.amount.maxPerAction}`);
  }
  if (typeof amount === "bigint" && typeof spent === "bigint" && typeof maxPerPeriod === "bigint" && amount + spent > maxPerPeriod) {
    reasons.push(`amount plus period spend exceeds max ${envelope.amount.maxPerPeriod} per ${envelope.amount.period}`);
  }

  if (!Array.isArray(envelope.schedule.days)) {
    reasons.push("schedule.days must be an array");
  } else if (!isWithinSchedule(envelope, request.requestedAt)) {
    reasons.push("requestedAt is outside the allowed schedule window");
  }

  return reasons;
};

export const evaluateEnvelope = (
  envelope: PolicyEnvelope,
  request: EvaluationRequest,
  evaluatedAt?: string
): PolicyEvaluation => {
  const effectiveEvaluatedAt = evaluatedAt ?? request.requestedAt;
  const policyHash = hashEnvelope(envelope);
  const requestHash = hashRequest(request);
  const deniedReasons = evaluateReasons(envelope, request);
  const base = {
    version: "evaluation.v1" as const,
    envelopeId: envelope.id,
    requestId: request.id,
    policyHash,
    requestHash,
    evaluatedAt: effectiveEvaluatedAt
  };

  if (deniedReasons.length === 0) {
    const reasons = ["All envelope rules passed."];
    return {
      ...base,
      status: "allowed",
      approvalHash: hashBytes({ type: "policy.approval.v1", ...base, status: "allowed", reasons }),
      reasons
    };
  }

  return {
    ...base,
    status: "denied",
    denialHash: hashBytes({ type: "policy.denial.v1", ...base, status: "denied", reasons: deniedReasons }),
    reasons: deniedReasons
  };
};
