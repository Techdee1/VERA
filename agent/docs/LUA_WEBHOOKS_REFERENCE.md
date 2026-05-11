# Lua Webhooks Reference & VERA Integration

Quick reference guide for webhook implementations and integration with the VERA dashboard.

**Full Guides:**
- [LUA_WEBHOOKS.md](./LUA_WEBHOOKS.md) — Comprehensive webhooks guide
- [LUA_WEBHOOKS_TESTING.md](./LUA_WEBHOOKS_TESTING.md) — Testing and debugging guide

---

## Quick Start: Create & Deploy Webhook

### 1. Define Webhook

Create `src/webhooks/my-webhook.ts`:

```typescript
import { LuaWebhook, User } from 'lua-cli';

const myWebhook = new LuaWebhook({
  name: 'my-webhook',
  description: 'Handle incoming events',
  
  execute: async (event) => {
    const { query, headers, body } = event;
    
    // Your webhook logic here
    console.log('Event received:', body?.type);
    
    return { success: true };
  }
});

export default myWebhook;
```

### 2. Add to Agent

In `src/index.ts`:

```typescript
import { LuaAgent } from 'lua-cli';
import myWebhook from './webhooks/my-webhook';

export const agent = new LuaAgent({
  name: 'my-agent',
  skills: [...],
  webhooks: [myWebhook]  // Add here
});
```

### 3. Test Locally

```bash
lua test webhook --name my-webhook
# Or with payload:
lua test webhook --name my-webhook --input '{"query":{},"headers":{},"body":{"type":"test"}}'
```

### 4. Push & Deploy

```bash
lua push webhook --name my-webhook
lua deploy webhook --name my-webhook
```

### 5. Get Webhook URL

```bash
lua webhooks view --webhook-name my-webhook
# Copy the URL to your external service
```

---

## Webhook Event Structure

Every webhook receives this structure:

```typescript
{
  query: Record<string, any>,       // URL query parameters
  headers: Record<string, any>,     // HTTP headers
  body: any,                        // JSON payload from sender
  timestamp: string                 // ISO 8601 timestamp
}
```

**Example:**

```typescript
execute: async (event) => {
  const { query, headers, body, timestamp } = event;
  
  console.log('Query params:', event.query);
  console.log('Headers:', event.headers);
  console.log('Body:', event.body);
  console.log('Timestamp:', event.timestamp);
}
```

---

## Common Patterns

### Pattern 1: Event Type Router

```typescript
execute: async (event) => {
  const eventType = event.body?.type;
  
  switch (eventType) {
    case 'payment.succeeded':
      return await handlePaymentSuccess(event);
    case 'payment.failed':
      return await handlePaymentFailure(event);
    case 'order.created':
      return await handleOrderCreated(event);
    default:
      console.log('Unknown event:', eventType);
      return { received: true };
  }
}
```

### Pattern 2: User Notification

```typescript
import { User } from 'lua-cli';

execute: async (event) => {
  const userId = event.body?.metadata?.userId;
  if (!userId) {
    return { error: 'No user ID' };
  }
  
  const user = await User.get(userId);
  await user.send([{
    type: 'text',
    text: `Event: ${event.body?.type}`
  }]);
  
  return { notified: true };
}
```

### Pattern 3: Data Logging

```typescript
import { Data } from 'lua-cli';

execute: async (event) => {
  const eventId = event.body?.id;
  
  await Data.create('webhook-events', {
    type: event.body?.type,
    timestamp: event.timestamp,
    payload: event.body
  }, eventId);
  
  return { logged: true };
}
```

### Pattern 4: Error Handling

```typescript
execute: async (event) => {
  try {
    // Validate
    if (!event.body?.type) {
      throw new Error('Missing event type');
    }
    
    // Process
    await processEvent(event);
    
    return { success: true };
  } catch (error) {
    console.error('Webhook error:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
```

### Pattern 5: Idempotency

```typescript
import { Data } from 'lua-cli';

execute: async (event) => {
  const eventId = event.body?.id;
  
  // Check if already processed
  const processed = await Data.get('processed-events', eventId);
  if (processed) {
    return { already_processed: true };
  }
  
  // Process event
  await processEvent(event);
  
  // Mark as processed
  await Data.create('processed-events', { 
    processedAt: new Date().toISOString()
  }, eventId);
  
  return { success: true };
}
```

---

## Environment Variables

Store secrets in environment:

```typescript
import { env } from 'lua-cli';

const apiKey = env('API_KEY');
const webhookSecret = env('WEBHOOK_SECRET');
const bearerToken = env('BEARER_TOKEN');
```

Set environment variables:

```bash
# Sandbox
lua env sandbox set API_KEY secret_key_value

# Production
lua env production set API_KEY secret_key_value

# View
lua env production get API_KEY
```

---

## Signature Verification

For services like Stripe:

```typescript
import { createHmac } from 'crypto';

function verifySignature(body: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  return expectedSignature === signature;
}

execute: async (event) => {
  const signature = event.headers['stripe-signature'];
  const secret = env('STRIPE_WEBHOOK_SECRET');
  
  if (!verifySignature(JSON.stringify(event.body), signature, secret)) {
    return { error: 'Invalid signature', status: 401 };
  }
  
  // Process webhook...
}
```

---

## Testing Webhooks

### Local Testing

```bash
# Interactive
lua test webhook --name my-webhook

# With payload
lua test webhook --name my-webhook --input '{
  "query": {},
  "headers": {"x-custom": "value"},
  "body": {"type": "test", "data": {}}
}'
```

### Create Test File

**`test-fixtures/webhook-test.json`:**

```json
{
  "query": {},
  "headers": {"x-custom": "value"},
  "body": {
    "type": "payment.succeeded",
    "id": "evt_123",
    "data": {
      "amount": 2000,
      "currency": "usd"
    }
  }
}
```

Run:

```bash
lua test webhook --name my-webhook --input "$(cat test-fixtures/webhook-test.json)"
```

### Sandbox Testing

1. Deploy to sandbox: `lua push webhook`
2. Get webhook URL: `lua webhooks view --webhook-name my-webhook`
3. Configure external service with sandbox webhook URL
4. Trigger event in sandbox (Stripe test mode, Shopify dev store, etc.)
5. Check logs: `lua logs --webhook-name my-webhook`

---

## Deployment

### Push Webhook

```bash
# Interactive
lua push webhook

# Direct
lua push webhook --name my-webhook

# With version
lua push webhook --name my-webhook --set-version 2.0.0
```

### Deploy to Production

```bash
# Interactive
lua deploy webhook

# Direct
lua deploy webhook --name my-webhook

# Specific version
lua deploy webhook --name my-webhook --set-version 2.0.0
```

### Rollback

```bash
# View versions
lua webhooks versions --webhook-name my-webhook

# Rollback
lua deploy webhook --name my-webhook --set-version 1.0.5
```

---

## Monitoring

### View Logs

```bash
# All logs
lua logs --webhook-name my-webhook

# Last 50 lines
lua logs --webhook-name my-webhook --tail 50

# With format
lua logs --webhook-name my-webhook --format detailed
```

### Check Status

```bash
# Webhook info
lua webhooks view --webhook-name my-webhook

# List all webhooks
lua webhooks list

# See deployed versions
lua webhooks versions --webhook-name my-webhook
```

### Health Check

Create a simple health check webhook:

```typescript
const healthWebhook = new LuaWebhook({
  name: 'health-check',
  execute: async (event) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString()
    };
  }
});
```

Check health:

```bash
curl https://webhook.heylua.ai/{agentId}/health-check
```

---

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 404 Not Found | Webhook not deployed | `lua deploy webhook --name my-webhook` |
| 401 Unauthorized | Missing auth | Set env vars: `lua env production set ...` |
| Timeout | Long operation | Queue job instead of processing in webhook |
| Duplicates | No idempotency | Add idempotency check with Data API |
| Missing events | Wrong URL | Check: `lua webhooks view --webhook-name my-webhook` |

---

## VERA Dashboard Integration

### Agent Intake Webhook

The VERA backend uses `/api/v1/agent/intake` to forward transaction analysis requests to the Lua agent.

**Endpoint:** `POST https://whale-app-6npb9.ondigitalocean.app/api/v1/agent/intake`

**Request:**

```json
{
  "data": "CSV_TRANSACTION_DATA",
  "format": "csv",
  "sensitivity": "sensitive",
  "reason_mode": "aml",
  "generate_report": true,
  "case_reference": "alert-uuid",
  "reporting_period": "2025-01-15T00:00:00Z",
  "source": "vera-dashboard",
  "tenant": "vera-prod"
}
```

**Response:**

```json
{
  "success": true,
  "run_id": "run_xyz123",
  "analysis": {
    "risk_score": 0.87,
    "findings": ["..."]
  },
  "report": {
    "content_text": "..."
  },
  "str_draft_id": "str_abc123"
}
```

**Authentication:**

```
Headers:
  x-intake-key: <shared-key>
  Authorization: Bearer <lua-api-token>
```

### Dashboard Button Flow

1. User clicks "Run Agent Intake" on alert detail page
2. Frontend builds CSV payload from transaction data
3. Frontend calls `POST /api/v1/agent/intake`
4. Backend forwards to Lua webhook (transaction-intake)
5. Lua webhook returns analysis + report
6. Backend creates STR draft from report
7. Frontend redirects to `/str/{str_draft_id}`

### Configuration

**Backend Environment:**

```bash
# Get webhook URL
npx lua webhooks view --webhook-name transaction-intake

# Set in DigitalOcean App Platform:
LUA_TRANSACTION_INTAKE_WEBHOOK_URL=<url-from-above>
LUA_TRANSACTION_INTAKE_KEY=<shared-key>
LUA_TRANSACTION_INTAKE_BEARER_TOKEN=<from-npx-lua-auth-key>
```

**Frontend API:** [vera-frontend/src/api/agent.js](../../vera-frontend/src/api/agent.js)

```typescript
agentApi.intake(payload)  // POST /api/v1/agent/intake
```

**Backend Route:** [backend/app/api/routes/agent.py](../../backend/app/api/routes/agent.py)

```python
POST /api/v1/agent/intake
```

---

## CLI Commands Reference

```bash
# Create webhook
lua init

# Test webhook
lua test webhook --name webhook-name
lua test webhook --name webhook-name --input '{...}'

# Push webhook
lua push webhook
lua push webhook --name webhook-name
lua push webhook --name webhook-name --set-version 2.0.0

# Deploy webhook
lua deploy webhook
lua deploy webhook --name webhook-name
lua deploy webhook --name webhook-name --set-version 2.0.0

# View webhooks
lua webhooks list
lua webhooks view --webhook-name webhook-name
lua webhooks versions --webhook-name webhook-name

# Subscribe to events
lua webhooks list-events
lua webhooks subscribe --webhook-name webhook-name --event message.delivered
lua webhooks unsubscribe --webhook-name webhook-name --event message.delivered

# View logs
lua logs --webhook-name webhook-name
lua logs --webhook-name webhook-name --tail 50

# Environment
lua env sandbox get VAR_NAME
lua env sandbox set VAR_NAME value
lua env production get VAR_NAME
lua env production set VAR_NAME value
```

---

## Files & Structure

```
agent/
├── src/
│   ├── webhooks/              # Webhook handlers
│   │   ├── payment.ts
│   │   ├── orders.ts
│   │   └── transaction-intake.ts
│   ├── index.ts               # Agent config (includes webhooks)
│   └── ...
├── docs/
│   ├── LUA_WEBHOOKS.md        # Full guide
│   ├── LUA_WEBHOOKS_TESTING.md # Testing guide
│   └── LUA_WEBHOOKS_REFERENCE.md # This file
├── lua.skill.yaml             # Config (auto-managed)
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── .env.example               # Environment template
└── README.md                  # Project overview
```

---

## Best Practices

✅ **Do:**
- Validate all input from webhooks
- Return quickly (< 5 seconds)
- Queue long-running work with Jobs
- Store user IDs in external service metadata
- Use environment variables for secrets
- Implement idempotency checks
- Log webhook executions
- Test in sandbox before production
- Verify webhook signatures
- Monitor webhook logs

❌ **Don't:**
- Hardcode secrets in code
- Process long operations in webhook handler
- Forget to store user IDs in metadata
- Assume webhook will execute only once
- Skip input validation
- Block external service with slow processing
- Deploy without testing
- Ignore error cases
- Forget to return response to external service
- Ignore webhook logs in production

---

## Support & Resources

- **Lua Docs:** https://docs.heylua.ai
- **Webhook Docs:** https://docs.heylua.ai/overview/webhooks
- **LuaWebhook API:** https://docs.heylua.ai/api/luawebhook.md
- **CLI Reference:** https://docs.heylua.ai/cli/overview.md
- **Discord Community:** https://discord.gg/SRPEuwCzaD

---

**Version:** 1.0.0  
**Last Updated:** January 2025
