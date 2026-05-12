# Backend

Backend service scaffolding for GRACE Phase 1.

## Lua Agent Bridge

The backend now exposes `POST /api/v1/agent/intake` as a bridge to the Lua `transaction-intake` webhook.

When `generate_report=true` and `case_reference` is a valid alert UUID, the backend persists the returned report as an STR draft and includes `str_draft_id` in the response.

Required environment variables:
- `LUA_TRANSACTION_INTAKE_WEBHOOK_URL`
- `LUA_TRANSACTION_INTAKE_KEY` (optional, if webhook key protection is enabled)
- `LUA_TRANSACTION_INTAKE_BEARER_TOKEN` (optional, if upstream webhook endpoint requires bearer auth)
- `LUA_TRANSACTION_INTAKE_TIMEOUT_SECONDS` (optional, default `30`)

How to source these values:
- Deploy/activate webhook:
	- `cd agent`
	- `npx lua webhooks deploy --webhook-name transaction-intake --webhook-version latest`
	- `npx lua webhooks activate --webhook-name transaction-intake`
- Set webhook auth key in Lua env:
	- `cd agent`
	- `npx lua env production --key INTAKE_WEBHOOK_KEY --value <shared-secret>`
- Copy the webhook endpoint URL from the Lua dashboard for `transaction-intake` and set it as `LUA_TRANSACTION_INTAKE_WEBHOOK_URL`.
- Set `LUA_TRANSACTION_INTAKE_KEY` to the same `<shared-secret>` value used for `INTAKE_WEBHOOK_KEY`.
- If upstream returns `401` with `No token provided`, set `LUA_TRANSACTION_INTAKE_BEARER_TOKEN` in backend deployment env.

Expected request body fields:
- `data` (required, CSV/JSON string)
- `format` (`csv` or `json`)
- `sensitivity` (`low`, `medium`, `high`)
- `reason_mode` (`deterministic`, `live`)
- `generate_report` (boolean)
- `case_reference` (optional)
- `reporting_period` (optional)
- `source` (optional)
- `tenant` (optional)
