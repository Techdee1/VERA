# GRACE Submission Overview

## 1. What This Agent Does

GRACE is an AML investigation agent built on Lua AI. It ingests transaction data, models entity flows as a graph, detects suspicious patterns, produces explainable risk scores, and generates Suspicious Transaction Report drafts for compliance teams.

Core output principle: report drafts are never auto-filed and always returned as `PENDING_REVIEW`.

## 2. Architecture Summary

Pipeline stages:
1. `ParseTransactionsTool` parses CSV/JSON and normalizes records.
2. `BuildEntityGraphTool` constructs directed adjacency and graph stats.
3. `DetectPatternsTool` identifies suspicious heuristics.
4. `ReasonAboutClusterTool` produces deterministic or live-model reasoning.
5. `ScoreAndExplainRiskTool` computes direct + propagated risk.
6. `GenerateSTRTool` builds structured STR drafts.

Skill orchestration:
- `transaction-analysis` skill wraps full analysis orchestration.
- `reporting` skill enforces explicit report intent and safe report generation.
- `ping-skill` provides operational verification.

Safety controls:
- Report generation requires explicit user intent.
- Reporting path validates analysis readiness before STR generation.
- Postprocessor appends NFIU disclaimer for compliance-sensitive outputs.

Integration scaffolding:
- MCP server scaffold is included for external tool integrations via `src/mcp/amlIntelMcpServer.ts`.
- Agent wiring includes `mcpServers` so MCP primitives are compiler-discoverable and deployment-ready.

## 3. Evaluation Mapping (AI Engine Dimensions)

### Code quality
- Strict TypeScript + Zod validation.
- Deterministic sorting/outputs where feasible for test stability.
- Comprehensive unit tests for tools, skills, job, and postprocessor.

### Usefulness
- End-to-end AML workflow from raw data to explainable risk and report draft.
- Supports both sandbox tests and production smoke flows.

### Market opportunity
- Focuses on high-need AML/compliance workflows.
- Explicitly aligned to analyst review process, not full automation.

### Creativity
- Combines graph analytics + heuristic detection + explainable AI reasoning.
- Includes dual reporting path resilience (analysis object or raw-data-assisted flow).

### Architecture
- Modular primitives (tools, skills, job, postprocessor).
- Clear separation between orchestration and atomic tool responsibilities.

### Tooling and implementation
- Lua CLI compile/push/deploy integration.
- Reproducible npm scripts for regression checks.
- Fixture-driven CLI tests to validate negative and positive scenarios.

## 4. Key Files for Review

Core code:
- `src/index.ts`
- `src/tools/*.ts`
- `src/skills/*.ts`
- `src/jobs/dailyTransactionScan.ts`
- `src/processors/addNFIUDisclaimer.ts`
- `src/mcp/amlIntelMcpServer.ts`

Validation assets:
- `tests/*.test.ts`
- `tests/fixtures/analysis-negative.csv`
- `tests/fixtures/analysis-positive.csv`

Project config:
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `lua.skill.yaml`
- `.env.example`

## 5. Reproducibility Commands

```bash
npm run build
npm run typecheck
npm run lua:regression
npm run test:skill-analysis
npm run test:skill-reporting
npm run test:webhook-intake
```

## 6. Expected Smoke Outcomes

- Analysis negative fixture: `NO_CANDIDATES`
- Analysis positive fixture: `ANALYZED`
- Reporting flow: STR draft with `PENDING_REVIEW`

## 7. Deployment Notes

The project is structured for `lua push` and `lua deploy` workflows. Generated artifacts (`dist`, `dist-v2`, `node_modules`, runtime cache folders) are intentionally excluded from submission packaging.