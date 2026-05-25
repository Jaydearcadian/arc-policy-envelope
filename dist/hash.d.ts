import type { EvaluationRequest, Hex, PolicyEnvelope, PolicyEvaluation } from "./types.js";
export declare const hashBytes: (value: unknown) => Hex;
export declare const hashEnvelope: (envelope: PolicyEnvelope) => Hex;
export declare const hashRequest: (request: EvaluationRequest) => Hex;
export declare const hashEvaluation: (evaluation: PolicyEvaluation) => Hex;
