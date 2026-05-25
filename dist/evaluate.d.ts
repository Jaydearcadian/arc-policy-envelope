import type { EvaluationRequest, PolicyEnvelope, PolicyEvaluation } from "./types.js";
export declare const evaluateEnvelope: (envelope: PolicyEnvelope, request: EvaluationRequest, evaluatedAt?: string) => PolicyEvaluation;
