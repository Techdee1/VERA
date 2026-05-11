# Squad Backend Integration (VERA)

This document guides backend integration of Squad into the existing VERA pipeline. It focuses on the minimal, correct implementation and operational steps to ensure the integration works end-to-end without disrupting the current ingestion, detection, and STR workflows.

## Objectives

- Ingest Squad transaction events into the existing pipeline via webhook.
- Trigger a Squad payment action when an STR is approved and filed.
- Preserve current async ingestion, graph updates, detection, risk scoring, and audit logging.

## Integration Points

1) Webhook ingest (Squad as data source)
- New endpoint: /api/v1/webhooks/squad
- Purpose: Receive Squad transaction events, validate signature, map to internal ingest schema, enqueue existing ingest job.

2) STR filing action (Squad as action layer)
- New endpoint: /api/v1/str/{id}/file
- Purpose: Only after approval, call Squad payment initiate endpoint, store Squad transaction reference on the STR, and log audit event.

## Required Environment Variables

- SQUAD_SECRET_KEY: API key used for payment initiation.
- SQUAD_WEBHOOK_SECRET: HMAC secret for webhook signature verification.
- COMPLIANCE_EMAIL: Email used for Squad payment initiation payload.
- BASE_URL: Public backend base URL used in Squad callback references.

## Data Mapping Requirements (Webhook)

- Accept only the expected Squad event type for completed payments.
- Validate HMAC signature using the raw request body.
- Map the Squad payload to the existing TransactionIngestItem schema:
  - id: transaction reference from Squad
  - sender_id: Squad sender identifier (prefer customer_identifier if available)
  - receiver_id: Squad merchant identifier
  - amount_ngn: convert from kobo to Naira
  - timestamp: Squad createdAt
  - channel: "squad_payment"
  - sender_name, receiver_name if present

## STR Filing Requirements (Action)

- Only allow filing if the STR decision is approved.
- Call Squad payment initiation with a unique transaction_ref tied to the STR id.
- Persist the returned transaction_ref on the STR record.
- Write an audit log entry with action type str_filed and the Squad reference.

## Pipeline Fit and Non-Goals

- Do not change the ingest pipeline logic or Celery worker flow.
- Webhook should only map and enqueue; all detection and scoring remain unchanged.
- STR filing should not bypass the existing STR decision workflow.

## Implementation Checklist

- Add webhook router in backend API routes.
- Verify raw-body HMAC signature check.
- Add webhook event mapping to TransactionIngestItem.
- Create ingest job through existing ingest service.
- Add STR filing endpoint in existing STR routes.
- Enforce approved decision check before filing.
- Add Squad payment initiation call and error handling.
- Save Squad transaction reference on STR model.
- Add audit log entry for filing.
- Add environment variables to config and example env file.
- Add minimal docs update in backend README to reference Squad flow.

## Testing Checklist

Webhook ingestion:
- Valid signature is accepted and returns 202 or accepted response.
- Invalid signature returns 401 and does not enqueue.
- Unsupported event type returns ignored response.
- Valid payload creates an ingest job and updates pipeline downstream.

STR filing:
- STR without approval returns 409.
- Approved STR triggers Squad payment call and stores transaction_ref.
- Failed Squad API call does not mark STR as filed.
- Audit log contains str_filed entry with Squad reference.

Integration stability:
- Existing ingest, detection, and STR generation remain unchanged.
- No duplicate alerts caused by webhook retries.
- Webhook handler is idempotent at the job level.

## Operational Notes

- Register webhook URL in Squad dashboard and verify it reaches the new endpoint.
- Use Squad sandbox simulator to fire a test transaction into VERA.
- Ensure frontend live feed (handled by frontend dev) updates after ingestion.

## Acceptance Criteria

- Squad webhook transactions appear in the transaction feed and graph.
- A test STR can be approved and filed, returning a Squad transaction reference.
- Audit log captures both ingest and filing events.
