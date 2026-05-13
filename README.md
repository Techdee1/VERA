# VERA — Verification Engine for Risk Analysis

> **Squad Hackathon 3.0 · Smart Systems: The Intelligent Economy**
> Built by **Team Veltrix**

VERA is an AI-powered financial trust verification platform that detects fraud rings, scores entity trustworthiness using network analysis, and executes financial consequences through Squad's payment infrastructure.

**Live demo:** https://vera-delta-seven.vercel.app
**Backend API:** https://vera-c5ccs.ondigitalocean.app/docs

---

## The Problem

₦50B+ is lost annually to financial fraud in Nigeria. Traditional AML systems flag individual suspicious transactions — but modern fraud hides in **networks**: shell companies, layered transfer chains, and coordinated POS cash-out rings that each look innocent in isolation.

VERA maps the network. Scores the trust. Stops the ring.

---

## How It Works

```
Squad Payment → Webhook → VERA Ingest → Neo4j Graph → Pattern Detection → Trust Score → STR Draft → Squad Filing
```

1. **Ingest** — Squad payments arrive via verified HMAC webhook or manual upload
2. **Resolve** — Entity deduplication using BVN, NIN, and fuzzy name matching
3. **Model** — Live relationship graph built in Neo4j (entities + transaction edges)
4. **Detect** — GNN heuristics + Isolation Forest anomaly detection identify fraud rings
5. **Score** — Every entity gets a VERA Trust Score (0–100%) with full AI reasoning
6. **Report** — Groq LLM auto-drafts NFIU-compliant STRs with human review
7. **Enforce** — Approved STRs trigger Squad payment transfer to quarantine account

---

## Squad API Integration

| Integration | Endpoint | Purpose |
|-------------|----------|---------|
| Webhook Ingestion | `POST /api/v1/webhooks/squad` | Receives Squad payment events (HMAC verified) |
| STR Filing | `POST /api/v1/str/{id}/file` | Initiates Squad transfer when fraud ring confirmed |
| Simulate | `POST /api/v1/webhooks/squad/simulate` | Demo — injects a live Squad transaction |

Squad is **structural** to VERA, not bolted on. It is both the data source (transaction ingest) and the enforcement layer (financial consequence on confirmed fraud).

---

## AI & Intelligence Layer

| Component | Technology | Role |
|-----------|-----------|------|
| Graph Pattern Detection | GNN Heuristics (Neo4j) | Shell Director Web, Layered Transfer Chain, POS Cash-Out Ring |
| Anomaly Detection | Isolation Forest (scikit-learn) | Statistical outlier scoring on 6 transaction features |
| Trust Score | Network risk propagation | Aggregates alert risk across entity connection graph |
| STR Generation | Groq `llama-3.3-70b-versatile` | NFIU-compliant narrative drafting with regulatory framing |
| Responsible AI | False positive tracking | Bias monitoring, model feature list, immutable audit trail |

### Anomaly Model Features
`amount_ngn` · `hour_of_day` · `day_of_week` · `sender_degree` · `receiver_fan_in` · `is_round_amount`

Train locally:
```bash
python scripts/train_anomaly_model.py
# Writes models/isolation_forest.joblib + models/scaler.joblib
```

---

## Tech Stack

```
Frontend    React 18 + Vite · TanStack Query · D3.js graph viz · Tailwind CSS
Backend     FastAPI (Python) · SQLAlchemy · Pydantic
Database    PostgreSQL (transactions) · Neo4j AuraDB (graph) · Redis (job queue)
AI/ML       scikit-learn Isolation Forest · Groq LLM API
Infra       DigitalOcean App Platform · Vercel · Celery workers
```

---

## Setup & Run

### Prerequisites
- Python 3.11+, Node 18+
- PostgreSQL, Redis, Neo4j (or use cloud managed services)

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # fill in secrets (see table below)
uvicorn app.main:app --reload --port 8000
```

### Worker
```bash
cd backend
python -m app.workers.ingest_worker
```

### Frontend
```bash
cd vera-frontend
npm install
echo "VITE_API_BASE_URL=http://localhost:8000/api/v1" > .env
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `POSTGRES_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `NEO4J_URI` | Neo4j Bolt URI (`neo4j+s://...`) |
| `NEO4J_USER` | Neo4j username |
| `NEO4J_PASSWORD` | Neo4j password |
| `GROQ_API_KEY` | Groq API key for STR generation |
| `SQUAD_SECRET_KEY` | Squad API key |
| `SQUAD_WEBHOOK_SECRET` | HMAC secret for webhook verification |
| `SQUAD_MERCHANT_ID` | Squad merchant ID |
| `SQUAD_QUARANTINE_ACCOUNT` | Account number for fraud quarantine transfers |

### Seed demo data
```bash
cd backend
python scripts/seed_db.py
python scripts/train_anomaly_model.py
```

---

## API Reference

Interactive docs at `/docs`. Key endpoints:

```
GET  /api/v1/health
GET  /api/v1/entities?q=<search>          Entity search (name, BVN, NIN, CAC)
GET  /api/v1/entities/{id}/risk           VERA Trust Score + reasoning
GET  /api/v1/alerts                       Fraud alerts with risk scores
GET  /api/v1/graph                        Full relationship graph (nodes + links)
GET  /api/v1/transactions/recent          Live transaction feed
POST /api/v1/str/generate                 Generate NFIU-compliant STR draft (Groq)
POST /api/v1/str/{id}/file                File STR via Squad payment transfer
POST /api/v1/webhooks/squad               Squad payment webhook (HMAC verified)
POST /api/v1/webhooks/squad/simulate      Inject test transaction (demo only)
GET  /api/v1/responsible-ai/metrics       Model fairness & performance metrics
GET  /api/v1/audit-log                    Immutable compliance audit trail
```

---

## Repository Structure

```
vera-frontend/          React dashboard (Vite)
backend/
  app/
    api/routes/         FastAPI route handlers
    models/             SQLAlchemy ORM + enums
    schemas/            Pydantic request/response schemas
    services/           Business logic (ingest, graph, Squad)
    workers/            Celery async job processor
  scripts/              Seed data + model training
data/                   Synthetic dataset generation
docs/                   Implementation notes & runbooks
```

---

## The Pitch

> *"VERA watches every Squad transaction for fraud patterns in real time. When a fraud ring is confirmed, VERA generates the regulatory report and initiates the financial consequence — through Squad. Squad powers both the intelligence and the enforcement."*

---

*Built for Squad Hackathon 3.0 — Smart Systems: The Intelligent Economy · Team Veltrix · © 2026*
