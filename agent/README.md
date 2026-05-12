# GRACE Agent (Lua AI)

GRACE is an AML-focused Lua AI agent that analyzes transaction flows, detects suspicious patterns, scores explainable risk, and produces Suspicious Transaction Report drafts in `PENDING_REVIEW` status for human compliance review.

## Submission Snapshot

- Runtime: `lua-cli@3.12.2`
- Language: TypeScript (ESM)
- Core design: deterministic pipeline + optional live reasoning fallback
- Deployment status: skills and persona deployed (sandbox and production)

Key references:
- Architecture and evaluator mapping: `SUBMISSION_OVERVIEW.md`
- Implementation log and deployment evidence: `../docs/AGENT_IMPLEMENTATION_LOG.md`
- Quick execution guide: `QUICKSTART.md`

## Repository Layout (Submission-Relevant)

```text
agent/
    src/
        index.ts
        skills/
        tools/
        jobs/
        processors/
        types/
    tests/
        fixtures/
        *.test.ts
    lua.skill.yaml
    package.json
    package-lock.json
    tsconfig.json
    .env.example
    README.md
    QUICKSTART.md
    SUBMISSION_OVERVIEW.md
```

## Core Capability Flow

1. Parse transactions (`parse_transactions`)
2. Build graph (`build_entity_graph`)
3. Detect suspicious heuristics (`detect_patterns`)
4. Reason per candidate (`reason_about_cluster`)
5. Score + propagate explainable risk (`score_and_explain_risk`)
6. Generate STR draft with mandatory human-review framing (`generate_str` / `generate_str_report`)

## Quality and Reproducibility Commands

```bash
npm run build
npm run typecheck
npm run lua:regression
npm run test:skill-analysis
npm run test:skill-reporting
npm run test:webhook-intake
```

## Deployment Commands

```bash
npx lua push all --force --ci
npx lua deploy all --force --ci
```

## Compliance Guardrails

- STR outputs are explicit drafts only.
- Generated reports are always marked `PENDING_REVIEW`.
- Postprocessor adds NFIU safety disclaimer in report/compliance contexts.

