Basic Requirements

Purpose: Real-time fraud/anomaly scoring for instant payment transactions, separate from and complementary to existing sanctions screening.
Inputs required
Transaction data: amount, currency, sender/beneficiary identifiers, timestamp, rail, channel, memo
Sender behavioral baseline: average payment amount, payment frequency, historical beneficiary list (30/90-day)
Velocity signals: payment counts/amounts to same beneficiary and from same sender in short windows (1h/24h)
Beneficiary signal: is this a new beneficiary for this sender
Output required
Structured (not free-text) result: risk_score (0-100), risk_level (low/medium/high), reasoning (explanation), recommended_action (accept/hold/reject)
Functional requirement
Output is advisory only — no automated accept/reject/return execution; a human makes the final decision
Every request/response logged for audit purposes
Non-functional requirements
Must not block the core payment SLA (RTP ~5s / FedNow ~20s) — real-time LLM scoring should apply only to transactions already routed to a hold/review state, not every transaction inline
Must exclude full account numbers and other sensitive PII from data sent to any external API
Integration requirement
Standalone service, callable by the existing payment workflow engine, not embedded in the core payment backend
Prerequisite before building further
Confirm with Barclays' AI/GenAI governance function whether transaction-derived data can be sent to an external LLM API and whether it must route through an internal gateway
