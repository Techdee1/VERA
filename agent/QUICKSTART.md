# GRACE Quickstart

This guide is for validating GRACE quickly in sandbox and production.

## 1) Install

```bash
npm install
```

## 2) Quality Gate

```bash
npm run build
npm run typecheck
npm run lua:regression
npm run test:skill-analysis
npm run test:skill-reporting
npm run test:webhook-intake
```

Expected outcomes:
- Negative fixture: `NO_CANDIDATES`
- Positive fixture: `ANALYZED`

## 3) Sandbox Smoke Test

```bash
npx lua chat --env sandbox -m "Analyze my last transaction"
npx lua chat --env sandbox -m "Generate a report for the last quarter"
```

## 4) Production Smoke Test

```bash
CSV_DATA=$(tr '\n' ' ' < tests/fixtures/analysis-positive.csv | sed 's/  */ /g')

npx lua chat --env production -t grace-smoke-1 -m "Analyze these transactions and return a structured summary. Data:\n$CSV_DATA"
npx lua chat --env production -t grace-smoke-1 -m "I explicitly want you to generate the STR report now."
```

Expected production outcome:
- Analysis: `ANALYZED`
- Reporting: STR draft returned with `PENDING_REVIEW`

## 5) Deploy

```bash
npx lua push all --force --ci
npx lua deploy all --force --ci
npx lua mcp list
```

