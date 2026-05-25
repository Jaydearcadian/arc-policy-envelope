export type Hex = `0x${string}`;
export type ArcNetwork = "arc-testnet" | "arc-mainnet";
export type EnvelopeAsset = "USDC" | "EURC";
export type GrantMode = "soft" | "hard" | "hybrid";
export type Period = "day" | "week" | "month";
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type ActorScope = {
    allowedActorIds: string[];
    grantMode: GrantMode;
};
export type AssetRule = {
    network: ArcNetwork;
    asset: EnvelopeAsset;
};
export type AmountRule = {
    maxPerAction: string;
    maxPerPeriod: string;
    period: Period;
};
export type TargetRule = {
    allowedRecipientIds: string[];
    allowedVenueIds: string[];
};
export type ScheduleRule = {
    days: Weekday[];
    startHourUtc: number;
    endHourUtc: number;
};
export type PolicyEnvelope = {
    version: "envelope.v1";
    id: string;
    name: string;
    actor: ActorScope;
    asset: AssetRule;
    amount: AmountRule;
    target: TargetRule;
    schedule: ScheduleRule;
    createdAt: string;
};
export type RequestTarget = {
    kind: "recipient";
    recipientId: string;
} | {
    kind: "venue";
    venueId: string;
};
export type EvaluationRequest = {
    version: "request.v1";
    id: string;
    payerId: string;
    actorId: string;
    asset: EnvelopeAsset;
    network: ArcNetwork;
    amount: string;
    reason: string;
    target: RequestTarget;
    requestedAt: string;
    spentInPeriod: string;
};
export type AllowedEvaluation = {
    version: "evaluation.v1";
    status: "allowed";
    envelopeId: string;
    requestId: string;
    policyHash: Hex;
    requestHash: Hex;
    approvalHash: Hex;
    evaluatedAt: string;
    reasons: string[];
};
export type DeniedEvaluation = {
    version: "evaluation.v1";
    status: "denied";
    envelopeId: string;
    requestId: string;
    policyHash: Hex;
    requestHash: Hex;
    denialHash: Hex;
    evaluatedAt: string;
    reasons: string[];
};
export type PolicyEvaluation = AllowedEvaluation | DeniedEvaluation;
