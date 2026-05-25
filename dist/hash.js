import { createHash } from "node:crypto";
import { canonicalize } from "./canonical.js";
export const hashBytes = (value) => `0x${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
export const hashEnvelope = (envelope) => hashBytes(envelope);
export const hashRequest = (request) => hashBytes(request);
export const hashEvaluation = (evaluation) => hashBytes(evaluation);
