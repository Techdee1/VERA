# GRACE Agent on Lua — PRD V2 (Hackathon-Optimized)

## 1. Document Purpose
This PRD V2 refines the original GRACE Lua hackathon plan to maximize scoring on:
- code quality
- usefulness
- market opportunity
- architecture
- tooling and implementation quality
- real-world readiness

This version preserves the core concept and introduces stronger constraints for reliability, compliance safety, deterministic testing, and demo resilience.

## 2. Product Summary
GRACE Agent is a conversational AML investigation agent built with lua-cli and TypeScript. It analyzes transaction datasets, identifies suspicious Nigerian laundering patterns, produces confidence-weighted findings, and drafts NFIU-oriented STR reports for human review.

## 3. Scope Boundaries (Strict)
### In Scope
- New implementation under agent/ only.
- Conversational analysis via Lua agent, skills, and tools.
- In-memory graph construction per analysis session.
- STR draft generation in structured JSON plus narrative.
- Daily autonomous scan job with real analysis output.
- Deterministic test fixtures and repeatable demo transcript.

### Out of Scope
- No modification of backend/.
- No modification of grace-frontend/.
- No Neo4j/Postgres dependencies inside agent/.
- No automatic STR filing to regulators.

## 4. Core Design Decisions (V2)
### 4.1 Model Strategy
Use one primary orchestration model in Lua agent config for tool planning and sequencing.

Recommended primary model:
- openai/gpt-4o (or anthropic/claude-3-5-sonnet as approved fallback)

Groq usage policy:
- Optional fallback for specific heavy narrative tasks only.
- Never run dual-primary paths that create inconsistent outputs.

Decision rule:
- If primary model is healthy, use primary only.
- On failure threshold, fallback path is explicit and logged.

### 4.2 Tool Contract Standard
Every tool returns the same envelope:

```json
{
  "ok": true,
  "data": {},
  "error": null,
  "meta": {
    "tool": "tool_name",
    "duration_ms": 0,
    "version": "1.0.0"
  }
}
```

Failure shape:

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "TOOL_ERROR_CODE",
    "message": "Human-readable message",
    "retryable": true
  },
  "meta": {
    "tool": "tool_name",
    "duration_ms": 0,
    "version": "1.0.0"
  }
}
```

### 4.3 Compliance and Privacy Guardrails
- Never send raw BVN/NIN to LLM prompts.
- Mask all identifiers before reasoning and report generation prompts.
- Redact secrets and regulated fields from logs.
- Explicitly append human-review disclaimer on compliance outputs.

### 4.4 Reliability Policy
- Retries: exponential backoff for retryable model/API failures.
- Timeout budget per tool call.
- Graceful degradation to MONITOR or INSUFFICIENT_EVIDENCE if reasoning fails.
- No hard crash in user-facing conversation for recoverable errors.

## 5. Functional Requirements
### FR1: ParseTransactionsTool
- Input: CSV or JSON payload.
- Output: normalized transactions + parse summary.
- Must classify malformed records with reasons.

### FR2: BuildEntityGraphTool
- Build adjacency map and core graph statistics.
- Identify high fan-in/out hubs and shared-identifier clusters.

### FR3: DetectPatternsTool
- Heuristic prefilter only.
- Must output candidate list with evidence snippets.
- Sensitivity profile configurable (low, medium, high).

### FR4: ReasonAboutClusterTool
- LLM reasoning over candidate cluster evidence.
- Output includes assessment, confidence, red flags, alternatives considered, recommendation.
- Strict JSON schema response with fallback parse recovery.

### FR5: ScoreAndExplainRiskTool
- Compute direct risk from reasoning confidence.
- Propagate to one-hop neighbors with decay.
- Return score, level, explanation, and direct/indirect flag.

### FR6: GenerateSTRTool
- Produce structured STR draft with narrative and evidence references.
- Include clear status PENDING_REVIEW.
- Must never imply auto-filed status.

### FR7: Daily Automated Scan Job
- Run on schedule in Africa/Lagos timezone.
- Perform real analysis flow on latest dataset source.
- Produce structured summary artifact, not a placeholder message.

### FR8: PostProcessor Disclaimer
- Add compliance disclaimer when STR or filing context appears.
- Keep message concise and legally safe.

## 6. Non-Functional Requirements
### NFR1: Determinism for Demo
- Provide fixed fixture datasets and expected outputs.
- Keep deterministic mode for benchmark runs (temperature low, stable prompt templates).

### NFR2: Observability
- Log per tool: name, duration, success/failure code.
- Keep a run_id for full traceability across conversation steps.

### NFR3: Performance
- Target sub-20s for full analysis on 50-row demo batch.
- Use capped candidate/context sizes to control latency.

### NFR4: Cost Controls
- Cap token usage where possible.
- Truncate non-essential payload fields before model calls.

### NFR5: Security
- Secrets only via environment variables.
- .env excluded from git.
- No PII in plaintext logs.

## 7. Folder Structure

```text
GRACE/
  backend/                 # untouched
  grace-frontend/          # untouched
  data/                    # read-only fixture reuse
  agent/
    src/
      index.ts
      tools/
        ParseTransactionsTool.ts
        BuildEntityGraphTool.ts
        DetectPatternsTool.ts
        ReasonAboutClusterTool.ts
        ScoreAndExplainRiskTool.ts
        GenerateSTRTool.ts
      skills/
        transactionAnalysisSkill.ts
        reportingSkill.ts
      jobs/
        dailyTransactionScan.ts
      processors/
        addNFIUDisclaimer.ts
    tests/
      fixtures/
      expected/
    .env.example
    package.json
```

## 8. Skill Design Rules
### transaction-analysis skill
- Enforce sequence: parse -> graph -> detect -> reason -> score.
- If no candidates: return clean summary with confidence and stop.

### reporting skill
- Requires reasoning + risk outputs before STR drafting.
- Requires explicit user intent to generate report.
- Always return PENDING_REVIEW language.

## 9. Scoring Alignment Matrix (Hackathon)
| Judge Dimension | V2 Mechanism |
|---|---|
| Code quality | strict TypeScript, Zod schemas, shared tool envelope |
| Architecture | clear tool boundaries, two-skill orchestration, explicit fallback paths |
| Usefulness | real AML workflow: detect, reason, score, draft STR |
| Creativity | graph + AI reasoning over Nigerian-specific patterns |
| Tooling quality | 6 focused tools + job + postprocessor |
| Real-world value | autonomous scan, compliance-safe outputs, human-in-loop review |

## 10. Implementation Phases
### Phase 1: Core Tool Chain
- Implement FR1–FR5 with contracts and tests.
- Exit criteria: deterministic fixture run passes.

### Phase 2: Reporting and Compliance
- Implement FR6 and FR8.
- Exit criteria: STR output schema validated and disclaimer behavior verified.

### Phase 3: Autonomy and Reliability
- Implement FR7 with real scan payload flow.
- Add retries/timeouts/logging run_id.
- Exit criteria: scheduled run produces actionable summary.

### Phase 4: Demo Hardening
- Produce final script, backup transcript, expected outputs, and judge QA sheet.
- Exit criteria: two clean end-to-end dry runs.

## 11. Test Plan
### Unit Tests
- Parse validation cases.
- Heuristic threshold edges.
- Risk propagation correctness.
- STR schema integrity.

### Integration Tests
- End-to-end from parse to STR for known fixture.
- Failure path: reasoning API timeout -> graceful fallback.

### Demo Tests
- Sandbox conversation with 50 rows.
- Confidence/risk outputs match expected pattern narrative.
- STR generated as PENDING_REVIEW only.

## 12. Demo Script (Production-Like)
1. Paste fixture transaction dataset.
2. Agent parses, builds graph, detects candidates.
3. Agent reasons per candidate and summarizes strongest finding.
4. Agent returns risk scoring and recommended action.
5. On user request, agent generates STR draft with disclaimer.

Backup plan:
- Pre-saved transcript and expected JSON outputs if network instability occurs.

## 13. Risk Register and Mitigations
- LLM malformed JSON -> schema validation + parser fallback.
- API timeout/rate limit -> retry with backoff, then degrade to monitor recommendation.
- Over-flagging -> sensitivity control + explicit confidence communication.
- Compliance misstatement -> forced disclaimer and no auto-file semantics.

## 14. Release Checklist
- [ ] All tools return standard envelope.
- [ ] PII masking verified in prompts/logs.
- [ ] Deterministic fixture tests passing.
- [ ] Daily job performs actual analysis flow.
- [ ] End-to-end sandbox demo validated twice.
- [ ] Environment variables set in Lua production.
- [ ] Final judge demo script and backup transcript ready.

## 15. Decision Notes vs Original PRD
1. Keep the 6-tool architecture and skill split.
2. Tighten model strategy to prevent orchestration drift.
3. Upgrade daily job from placeholder to operational analysis.
4. Enforce compliance-safe data handling and deterministic test evidence.

---
Prepared for Team Overclock to maximize hackathon execution quality and judge scoring confidence.
