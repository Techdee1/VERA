# Nigeria AML Red Flags Playbook

Last Updated: 2026-04-24
Scope: Heuristic interpretation support for AML analysts.

## Pattern 1: Structuring Near Reporting Threshold
Indicators:
1. Multiple transfers clustered just below expected reporting thresholds.
2. Repeated sender-receiver pairs with near-threshold amounts.
3. Compressed timing and repetitive channel usage.

Analyst interpretation:
1. Check for transaction purpose consistency.
2. Verify if behavior deviates from historical profile.
3. Review linked counterparties for hidden aggregation behavior.

## Pattern 2: Rapid In/Out Flow
Indicators:
1. Inbound funds move out quickly with limited retention.
2. Outflow ratio remains high over short windows.
3. Repeated flow chains with minimal business justification.

Analyst interpretation:
1. Validate legitimate treasury or settlement explanations.
2. Investigate source-of-funds and destination purpose.
3. Flag potential layering behavior where rationale is weak.

## Pattern 3: Hub Conduit Activity
Indicators:
1. Node with elevated in-degree and out-degree.
2. Acts as transit point between multiple counterparties.
3. Volume concentration around same intermediary entity.

Analyst interpretation:
1. Validate if entity is known aggregator/payment processor.
2. Compare throughput against expected business model.
3. Escalate when counterparties and volumes are inconsistent with KYC profile.

## Pattern 4: Shared Identifier Cluster
Indicators:
1. Multiple entities linked by overlapping masked identifiers.
2. Reused identity markers beyond expected household or corporate structure.

Analyst interpretation:
1. Verify true beneficial ownership relationships.
2. Escalate where identifier sharing appears synthetic or deceptive.

## Confidence Guidance
1. High confidence requires multi-signal consistency and corroborating evidence.
2. Medium confidence indicates probable suspicion but incomplete corroboration.
3. Low confidence should default to monitoring unless additional evidence emerges.
