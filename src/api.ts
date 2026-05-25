import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

import { evaluateEnvelope } from "./evaluate.js";
import { hashEnvelope, hashEvaluation, hashRequest } from "./hash.js";
import type { EvaluationRequest, PolicyEnvelope, PolicyEvaluation } from "./types.js";

const MAX_BODY_BYTES = 256_000;
const PUBLIC_DIR = new URL("../public/", import.meta.url);

const sendJson = (response: ServerResponse, status: number, body: unknown) => {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body, null, 2));
};

const sendText = (response: ServerResponse, status: number, body: string, contentType: string) => {
  response.writeHead(status, { "content-type": contentType });
  response.end(body);
};

const readJson = async (request: IncomingMessage): Promise<unknown> => new Promise((resolve, reject) => {
  let body = "";
  let tooLarge = false;
  request.setEncoding("utf8");
  request.on("data", (chunk: string) => {
    if (tooLarge) return;
    body += chunk;
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
      tooLarge = true;
      reject(new Error("Request body too large"));
    }
  });
  request.on("end", () => {
    if (!body) return resolve({});
    try {
      resolve(JSON.parse(body) as unknown);
    } catch {
      reject(new Error("Request body must be valid JSON"));
    }
  });
  request.on("error", reject);
});

const bodyEnvelope = (body: unknown): PolicyEnvelope => {
  if (body && typeof body === "object" && "envelope" in body) return (body as { envelope: PolicyEnvelope }).envelope;
  return body as PolicyEnvelope;
};

const bodyRequest = (body: unknown): EvaluationRequest => {
  if (body && typeof body === "object" && "request" in body) return (body as { request: EvaluationRequest }).request;
  return body as EvaluationRequest;
};

const bodyEvaluation = (body: unknown): PolicyEvaluation => {
  if (body && typeof body === "object" && "evaluation" in body) return (body as { evaluation: PolicyEvaluation }).evaluation;
  return body as PolicyEvaluation;
};

const handlePost = async (path: string, request: IncomingMessage) => {
  const body = await readJson(request);
  if (path === "/envelopes/hash") return { status: 200, body: { policyHash: hashEnvelope(bodyEnvelope(body)) } };
  if (path === "/requests/hash") return { status: 200, body: { requestHash: hashRequest(bodyRequest(body)) } };
  if (path === "/evaluations/hash") return { status: 200, body: { evaluationHash: hashEvaluation(bodyEvaluation(body)) } };
  if (path === "/envelopes/evaluate") {
    const input = body as { envelope: PolicyEnvelope; request: EvaluationRequest; evaluatedAt?: string };
    const evaluation = evaluateEnvelope(input.envelope, input.request, input.evaluatedAt ?? input.request?.requestedAt);
    return {
      status: 200,
      body: {
        evaluation,
        policyRef: evaluation.status === "allowed"
          ? {
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
                request: input.request,
                envelope: input.envelope
              }
            }
          : null
      }
    };
  }
  return { status: 404, body: { error: "Not found" } };
};

const staticFile = async (path: string): Promise<{ status: number; body: string; type: string }> => {
  const file = path === "/" ? "index.html" : path.slice(1);
  if (!["index.html", "styles.css", "app.js"].includes(file)) {
    return { status: 404, body: "Not found", type: "text/plain; charset=utf-8" };
  }
  const type = file.endsWith(".css")
    ? "text/css; charset=utf-8"
    : file.endsWith(".js")
      ? "application/javascript; charset=utf-8"
      : "text/html; charset=utf-8";
  try {
    return { status: 200, body: await readFile(join(PUBLIC_DIR.pathname, file), "utf8"), type };
  } catch {
    return { status: 404, body: "Not found", type: "text/plain; charset=utf-8" };
  }
};

export const handleRequest = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (request.method === "GET" && url.pathname === "/health") {
      return sendJson(response, 200, { ok: true, service: "arc-policy-envelope" });
    }
    if (request.method === "GET") {
      const result = await staticFile(url.pathname);
      return sendText(response, result.status, result.body, result.type);
    }
    if (request.method === "POST") {
      const result = await handlePost(url.pathname, request);
      return sendJson(response, result.status, result.body);
    }
    return sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return sendJson(response, message === "Request body too large" ? 413 : 400, { error: message });
  }
};
