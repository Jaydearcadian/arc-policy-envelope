import { createHash } from "node:crypto";

import { canonicalize } from "./canonical.js";
import type { EvaluationRequest, Hex, PolicyEnvelope, PolicyEvaluation } from "./types.js";

export const hashBytes = (value: unknown): Hex =>
  `0x${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

export const hashEnvelope = (envelope: PolicyEnvelope): Hex => hashBytes(envelope);
export const hashRequest = (request: EvaluationRequest): Hex => hashBytes(request);
export const hashEvaluation = (evaluation: PolicyEvaluation): Hex => hashBytes(evaluation);
