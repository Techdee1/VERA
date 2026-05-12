# GRACE Product Requirements Document (Extracted)

Project Name: GRACE (Graph-based Risk And Compliance Engine)

Source: Extracted from `ComplianceGraph_PRD.pdf` and rewritten as structured markdown.

## Document Metadata

- Document: Product Requirements Document (PRD) v1.0
- Original project label in PDF: Compliance Graph
- Context: Microsoft AI Skills Week 2026 - RegTech Hackathon
- Stage: Selected for mentorship and final presentation (April 20-22, 2026)
- Audience: Engineering team (Frontend, Backend, AI) plus AI coding agents
- Owner: Akeem Jr Odebiyi

## Table of Contents

1. Executive Summary
2. The Problem
3. The Solution
4. How It Works (System Architecture)
5. Technical Stack
6. Implementation Plan
7. Team and Responsibilities
8. Demo Plan
9. Anticipated Hard Questions and Answers
10. Success Criteria
11. Appendix - Coding Agent Brief

## 1. Executive Summary

GRACE is an AI-powered AML/KYC intelligence platform built for Nigerian financial institutions. It models people, businesses, accounts, and transactions as a live graph and uses Graph Neural Networks (GNNs) to detect money laundering patterns that rule-based systems miss.

Where traditional tools evaluate customers one-by-one, GRACE analyzes relationships across the network and surfaces suspicious topologies in near real-time. It can auto-draft Suspicious Transaction Reports (STRs) for NFIU review and provide regulator-facing intelligence dashboards.

### Why This Matters

- Nigeria faces major financial crime losses yearly.
- Existing AML systems can produce very high false-positive rates.
- Nigeria-specific laundering patterns are often not captured by globally trained tools.
- FATF grey-listing and tighter regulatory pressure increase urgency for better compliance tooling.

### Core Differentiators

- Network-level detection instead of isolated checks
- Nigeria-first topology and reporting design
- End-to-end workflow from ingestion to STR draft
- Regulator-grade auditability with immutable records
- Azure-native architecture for scaling and hackathon alignment

## 2. The Problem

Money laundering in Nigeria occurs through connected networks, but most current compliance stacks are optimized for isolated record checks and threshold rules.

### Main Failures in Current Tools

- Isolated KYC checks miss shared directors, addresses, and hidden identity links.
- Rule-based AML thresholds are easy to evade through structured transfers.
- Many global tools underperform on local patterns (POS rings, bureau de change loops, agent banking chains, crypto cash-out loops).
- STR workflows are often manual and slow.
- Enterprise tools are often too expensive for many fintechs and microfinance institutions.

### Regulatory Pressure

- FATF grey-listing increased compliance friction.
- Enforcement expectations from CBN and NFIU are rising.
- Faster and more reliable detection/reporting is now operationally critical.

## 3. The Solution

GRACE treats the financial ecosystem as a graph and applies AI across ingestion, identity resolution, pattern detection, risk propagation, and regulator-ready reporting.

### Five Core Capabilities

1. Live Financial Graph
- Continuous ingestion of transactions, KYC records, identity linkages, sanctions, and PEP data into Neo4j.

2. Entity Resolution
- AI-assisted linking and deduplication across noisy records using fuzzy and semantic matching.

3. GNN-Based Pattern Detection
- GraphSAGE/GAT-style modeling for topology-level suspicious behavior detection.

4. Dynamic Risk Propagation
- Risk changes spread across connected entities based on relationship strength.

5. Automated STR Generation
- Azure OpenAI drafts NFIU-format STR narratives for compliance officer review, with full audit logging.

### Target Users

- Primary: Chief Compliance Officers and Chief Risk Officers at Nigerian banks, fintechs, and microfinance institutions
- Secondary: Regulators (NFIU, CBN, SEC)
- Initial market wedge: Mid-size fintechs and MFBs underserved by enterprise AML vendors

## 4. How It Works (System Architecture)

The platform is organized as five stages:

1. Ingest
- Inputs: Transactions (CSV/API), KYC, identity datasets, sanctions/PEP lists
- Process: Webhooks and batch ETL into PostgreSQL staging
- Output: Normalized records

2. Resolve
- Input: Raw entity records from multiple sources
- Process: RapidFuzz plus Sentence-BERT matching and clustering
- Output: Canonical entities with confidence scores

3. Model
- Input: Resolved entities and transactions
- Process: Update Neo4j graph with typed nodes and edges
- Output: Live relationship graph

4. Detect
- Input: Subgraphs from Neo4j
- Process: GraphSAGE inference plus weighted risk propagation
- Output: Risk-scored entities and flagged subgraphs

5. Report
- Input: Flagged graph evidence plus context
- Process: Azure OpenAI STR draft generation plus audit logging
- Output: STR draft, audit records, dashboard updates

### Concurrent Runtime Loops

- Ingestion Loop (continuous): FastAPI receives events, Celery normalizes/stages, graph updates are queued.
- Detection Loop (event-driven): Graph updates trigger localized subgraph scoring and risk updates.
- Reporting Loop (triggered): Threshold breaches generate STR drafts and refresh dashboards.

## 5. Technical Stack

### Stack Selection Goals

- Team familiarity
- Azure compatibility
- Demo readiness under hackathon constraints

### Core Technologies

- AI/ML: PyTorch Geometric, Sentence-BERT, Azure OpenAI
- Graph DB: Neo4j
- Relational DB: PostgreSQL
- Cache/Queue: Redis (including Celery broker usage)
- Backend: FastAPI (Python 3.11+), Celery
- Frontend: React 18 + TypeScript, Tailwind CSS, D3.js/vis.js
- Cloud: Azure (AKS, Azure Functions, Azure OpenAI)
- DevOps: Docker Compose, GitHub Actions, Azure Container Apps

### Stack Principles

1. Python-first backend and AI implementation
2. Local-first Docker development for low-cost iteration
3. Cloud-ready containerized deployment path to Azure

## 6. Implementation Plan

### Phase 01 - Foundation (Days 1-2)

- Monorepo and Docker Compose setup
- Core schema definitions (Entity, Transaction, RiskScore, STR)
- Synthetic dataset generation (~500 entities, ~2000 transactions, 3-4 laundering rings)
- CI setup with GitHub Actions

### Phase 02 - Core Engine (Days 3-5)

- Entity resolution module (RapidFuzz + Sentence-BERT)
- Graph construction service in Neo4j
- GNN inference module (GraphSAGE)
- Risk propagation logic via Cypher
- Backend REST API for frontend consumption

### Phase 03 - Frontend and STR (Days 6-8)

- Dashboard with search, risk view, and alerts
- D3 graph visualization with interactive nodes
- STR generation pipeline using Azure OpenAI
- Immutable audit log of detections and reviewer actions

### Phase 04 - Demo Polish (Days 9-10)

- End-to-end demo workflow
- Pre-loaded dataset for high-impact visualization
- Azure deployment for stable demo URL
- Local Docker fallback if cloud fails

## 7. Team and Responsibilities

### Frontend Developer

- Dashboard, graph visualization, STR review experience

### Backend Developer

- FastAPI APIs, ingestion pipelines, Celery workers, infrastructure, integrations, audit logging, deployment

### AI Developer

- Entity resolution, GNN training/inference, risk logic, STR prompt pipeline

### Coordination Model

- Daily standup updates
- Integration checkpoint every two days
- Shared architecture/scope decision log
- Demo rehearsals on Days 9 and 10

### Shared Conventions

- Python: Black + Ruff
- TypeScript: Prettier + ESLint
- Branching: trunk-based with short-lived feature branches and PR review
- Commits: Conventional Commits
- Secrets: local .env and Azure Key Vault in deployed environments
- API contracts: OpenAPI from FastAPI and generated TS client types

## 8. Demo Plan

The demo is intended to deliver one clear proof moment:

- A live transaction triggers risk propagation through the graph, highlights a laundering ring, and produces an auto-drafted STR with supporting evidence in under 30 seconds.

### 6-Minute Demo Flow

1. Problem framing with real-world loss scenario
2. Dashboard walkthrough
3. Live transaction simulation and graph updates
4. Suspicious event and cascading risk visualization
5. STR generation and audit trail review
6. Business impact close

### Demo Dataset Design

- About 500 entities and realistic transactions
- Embedded patterns:
  - POS cash-out ring
  - Shell director web
  - Layered transfer chain

### Demo Risk Mitigation

- Pre-recorded fallback video
- Fully local Docker fallback
- Known-good database snapshot
- Venue connectivity contingency plan

## 9. Anticipated Hard Questions and Answers

The PRD includes detailed judge Q and A guidance. Key themes:

- Data strategy without cross-bank data pooling
- Nigeria-specific pattern learning strategy
- Differentiation vs global AML vendors on cost/local integration
- Regulatory positioning and human-in-the-loop controls
- NDPA and tenant-level data residency approach
- Scale strategy for graph and GNN workloads
- STR pipeline grounding and auditability vs plain chatbot output
- Business model and unit economics
- Why internal bank build-vs-buy usually fails
- False positive handling through explainability and human review

## 10. Success Criteria

### Hackathon Success

- Full end-to-end flow works live: ingestion -> detection -> STR -> audit log
- Graph visualization communicates pattern quickly to non-technical judges
- Team handles technical/business scrutiny confidently
- Architecture appears technically sound to expert judges
- Nigeria-specific value proposition is clear and credible

### Post-Hackathon Stretch Goals

- Pilot conversations with fintechs/MFBs
- Open-source or strongly documented repository credibility
- Public demo video distribution
- Continued development with design partner commitment

## 11. Appendix - Coding Agent Brief

### Suggested Monorepo Structure

compliance-graph/
- backend/
  - app/
    - api/
    - core/
    - models/
    - services/
    - workers/
  - tests/
- ai/
  - entity_resolution/
  - gnn/
  - str_generation/
- frontend/
  - src/
    - components/
    - pages/
    - api/
    - viz/
- infra/
- data/
- docs/

### Backend Modules

- Ingestion API: transaction endpoint, validation, staging, queueing
- Graph service: Neo4j entity/transaction upserts and subgraph retrieval
- Risk service: risk computation + propagation + Redis caching
- Alerts service: threshold monitoring and STR triggering
- STR service: evidence package assembly, Azure OpenAI generation, content hashing
- Audit service: immutable event records for detections/reviews/approvals

### AI Modules

- Entity resolution using fuzzy + semantic similarity
- GraphSAGE GNN with per-node risk and per-subgraph anomaly scoring
- STR narrative generator from structured graph evidence

### Frontend Modules

- Dashboard metrics and alerts
- Force-directed graph visualization with risk-based coloring
- Alert detail with evidence and STR trigger
- STR review workflow with approve/reject actions

### Synthetic Data Generator Requirements

- 500 entities (individuals, businesses, accounts)
- 2000 transactions over 90 days
- Nigerian-style names/addresses
- Embedded laundering patterns for demo realism

### Recommended Build Order

1. Docker Compose + baseline FastAPI + Neo4j connection
2. Synthetic data generator + ingestion endpoint
3. Graph service + entity resolution
4. Frontend shell + API client
5. GNN inference
6. Graph visualization
7. STR generation
8. Immutable audit logging
9. Demo polish

## Notes

- This markdown preserves and structures the information extracted from the PRD PDF.
- Project naming has been normalized to GRACE for repository consistency.