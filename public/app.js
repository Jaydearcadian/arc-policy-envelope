const envelope = {
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

const requests = {
  allowed: {
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
  },
  denied: {
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
  }
};

const $ = (id) => document.getElementById(id);
const format = (value) => JSON.stringify(value, null, 2);

const scenario = $("scenario");
const envelopePre = $("envelope");
const requestPre = $("request");
const status = $("status");
const policyHash = $("policyHash");
const requestHash = $("requestHash");
const decisionHash = $("decisionHash");
const reasons = $("reasons");
const policyRef = $("policyRef");
const button = $("evaluate");
const verdict = $("verdict");

const selectedRequest = () => requests[scenario.value];

const renderRequest = () => {
  envelopePre.textContent = format(envelope);
  requestPre.textContent = format(selectedRequest());
};

const setStatus = (label, variant = "") => {
  status.textContent = label;
  status.className = `status ${variant}`.trim();
};

const renderReasons = (items) => {
  reasons.replaceChildren();
  for (const reason of items) {
    const item = document.createElement("li");
    item.textContent = reason;
    reasons.appendChild(item);
  }
};

const resetOutput = () => {
  setStatus("Not evaluated");
  verdict.textContent = "Choose a scenario and evaluate the envelope.";
  policyHash.textContent = "n/a";
  requestHash.textContent = "n/a";
  decisionHash.textContent = "n/a";
  renderReasons(["No evaluation has run for the selected request."]);
  policyRef.textContent = "Evaluate an allowed request to create a PolicyRef.";
};

const renderResult = ({ evaluation, policyRef: ref }) => {
  setStatus(evaluation.status, evaluation.status);
  verdict.textContent = evaluation.status === "allowed"
    ? "Allowed: policy evidence was emitted only. No transaction was submitted."
    : "Denied: reasons were emitted only. No transaction was submitted.";
  policyHash.textContent = evaluation.policyHash;
  requestHash.textContent = evaluation.requestHash;
  decisionHash.textContent = evaluation.approvalHash ?? evaluation.denialHash;
  renderReasons(evaluation.reasons);
  policyRef.textContent = ref
    ? format(ref)
    : "Denied evaluations do not produce a PolicyRef.";
};

const evaluate = async () => {
  button.disabled = true;
  setStatus("Evaluating");
  verdict.textContent = "Calling the local policy API.";
  try {
    const response = await fetch("/envelopes/evaluate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        envelope,
        request: selectedRequest(),
        evaluatedAt: "2026-05-23T12:00:01.000Z"
      })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Evaluation failed");
    renderResult(payload);
  } catch (error) {
    setStatus("Error", "error");
    verdict.textContent = "The evaluation did not complete. Serve this page from the local API and try again.";
    policyHash.textContent = "n/a";
    requestHash.textContent = "n/a";
    decisionHash.textContent = "n/a";
    renderReasons([error instanceof Error ? error.message : "Evaluation failed"]);
    policyRef.textContent = "No PolicyRef available.";
  } finally {
    button.disabled = false;
  }
};

scenario.addEventListener("change", () => {
  renderRequest();
  resetOutput();
});
button.addEventListener("click", evaluate);
renderRequest();
resetOutput();
