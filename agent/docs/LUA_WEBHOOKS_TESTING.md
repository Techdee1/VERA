# Lua Webhooks: Testing, Debugging & Operations

Comprehensive guide for testing webhook implementations, debugging issues, and managing webhooks in production.

**Related:** [LUA_WEBHOOKS.md](./LUA_WEBHOOKS.md)

## Table of Contents

1. [Local Testing](#local-testing)
2. [Sandbox Testing](#sandbox-testing)
3. [Production Debugging](#production-debugging)
4. [Common Issues & Solutions](#common-issues--solutions)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Performance Optimization](#performance-optimization)
7. [Webhook Management](#webhook-management)
8. [Security Hardening](#security-hardening)

---

## Local Testing

### Using `lua test` Command

Test individual webhooks locally before deployment:

```bash
lua test
# Output shows menu:
# 🧪 Testing Lua skill...
# 📦 Compiling code first...
# ✅ Skill compiled successfully
# ? 🔧 Select a tool to test:
#   › webhook: payment-webhook
#     webhook: order-webhook
#     skill: customer-service
```

#### Testing a Webhook Interactively

```bash
lua test webhook --name payment-webhook
```

You'll be prompted for input:

```
📝 Enter input values for payment-webhook:

? headers (optional): {"stripe-signature":"t=123,v1=abc..."}
? body (required): {"type":"payment_intent.succeeded","data":{"object":{"amount":2000}}}

🚀 Executing webhook...
✅ Webhook execution successful!
Output: {
  "success": true,
  "processed": "payment_intent.succeeded"
}
```

#### Testing in Non-Interactive Mode

```bash
# Test webhook with JSON input
lua test webhook --name payment-webhook --input '{
  "query": {},
  "headers": {"stripe-signature": "t=123,v1=abc..."},
  "body": {"type": "payment_intent.succeeded", "data": {"object": {"amount": 2000}}}
}'
```

### Sample Test Payloads

#### Stripe Test Payload

```bash
lua test webhook --name stripe-payment-webhook --input '{
  "query": {},
  "headers": {"stripe-signature": "t=1234567890,v1=abc123..."},
  "body": {
    "id": "evt_test_1234567890",
    "type": "payment_intent.succeeded",
    "created": 1234567890,
    "data": {
      "object": {
        "id": "pi_test_123456",
        "object": "payment_intent",
        "amount": 2000,
        "amount_capturable": 0,
        "amount_details": {"tip": 0},
        "amount_received": 2000,
        "application": null,
        "automatic_payment_methods": null,
        "canceled_at": null,
        "cancellation_reason": null,
        "capture_method": "automatic",
        "client_secret": "pi_test_123456_secret_123456",
        "confirmation_method": "automatic",
        "created": 1234567890,
        "currency": "usd",
        "customer": null,
        "description": null,
        "last_payment_error": null,
        "livemode": false,
        "metadata": {
          "orderId": "order_12345",
          "customerId": "lua_user_67890"
        },
        "next_action": null,
        "on_behalf_of": null,
        "payment_method": "pm_test_123456",
        "payment_method_types": ["card"],
        "processing": null,
        "receipt_email": null,
        "review": null,
        "setup_future_usage": null,
        "shipping": null,
        "source": null,
        "statement_descriptor": null,
        "statement_descriptor_suffix": null,
        "status": "succeeded",
        "transfer_data": null,
        "transfer_group": null
      }
    }
  }
}'
```

#### Shopify Test Payload

```bash
lua test webhook --name shopify-order-webhook --input '{
  "query": {},
  "headers": {"x-shopify-topic": "orders/create"},
  "body": {
    "id": 123456789,
    "email": "customer@example.com",
    "created_at": "2025-01-15T10:30:00-05:00",
    "updated_at": "2025-01-15T10:30:00-05:00",
    "order_number": 1001,
    "note": null,
    "test": false,
    "total_price": "99.99",
    "subtotal_price": "99.99",
    "total_weight": 500,
    "currency": "USD",
    "financial_status": "paid",
    "fulfillment_status": null,
    "fulfillment_status_v2": "unfullfilled",
    "fulfillments": [],
    "line_items": [
      {
        "id": 987654321,
        "product_id": 123456,
        "title": "Example Product",
        "quantity": 1,
        "sku": "SKU123",
        "variant_id": 456789,
        "price": "99.99",
        "vendor": "Example Vendor"
      }
    ],
    "customer": {
      "id": "lua_user_12345",
      "email": "customer@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "default_address": {
        "country": "United States",
        "city": "New York",
        "state": "NY",
        "zip": "10001"
      }
    }
  }
}'
```

#### GitHub Test Payload

```bash
lua test webhook --name github-deployment-webhook --input '{
  "query": {},
  "headers": {"x-github-event": "deployment_status"},
  "body": {
    "action": "created",
    "deployment": {
      "url": "https://api.github.com/repos/octocat/Hello-World/deployments/1",
      "id": 1296269,
      "node_id": "MDEwOlJlcG9zaXRvcnkxMjk2MjY5",
      "sha": "a84d88e7554fc1fa21e6bae62d09ec9b1f8e3ad1",
      "ref": "main",
      "task": "deploy",
      "payload": {},
      "original_environment": "production",
      "environment": "production",
      "description": "Deployment to production",
      "creator": {
        "login": "octocat",
        "id": 1,
        "type": "User"
      },
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:30:00Z",
      "statuses_url": "https://api.github.com/repos/octocat/Hello-World/deployments/1/statuses",
      "repository_url": "https://api.github.com/repos/octocat/Hello-World",
      "auto_merge": false,
      "required_contexts": []
    },
    "deployment_status": {
      "url": "https://api.github.com/repos/octocat/Hello-World/deployments/1/statuses/1",
      "id": 1,
      "node_id": "MDEyOkRlcGxveW1lbnRTdGF0dXMx",
      "state": "success",
      "creator": {
        "login": "octocat",
        "id": 1,
        "type": "User"
      },
      "description": "Deployment succeeded",
      "environment": "production",
      "environment_url": "https://example.com",
      "repository_url": "https://api.github.com/repos/octocat/Hello-World",
      "created_at": "2025-01-15T10:35:00Z",
      "updated_at": "2025-01-15T10:35:00Z",
      "target_url": "https://ci.example.com/builds/1"
    }
  }
}'
```

### Creating Reusable Test Fixtures

Save test payloads to files for repeated testing:

**`test-fixtures/stripe-payment.json`**

```json
{
  "query": {},
  "headers": {
    "stripe-signature": "t=1234567890,v1=abc123..."
  },
  "body": {
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "amount": 2000,
        "currency": "usd",
        "metadata": {
          "orderId": "order_12345",
          "customerId": "lua_user_67890"
        }
      }
    }
  }
}
```

Load and test:

```bash
lua test webhook --name stripe-payment-webhook --input "$(cat test-fixtures/stripe-payment.json)"
```

---

## Sandbox Testing

### Deploying to Sandbox

```bash
# Push version to sandbox
lua push webhook --name payment-webhook

# Test interactively in sandbox
lua chat
# Agent: "I can help you with payments. What would you like to do?"
```

### Creating Real Test Events

For services that support webhooks, configure the webhook URL in your test account:

#### Stripe Sandbox Testing

1. **Get your webhook URL:**

```bash
lua webhooks view --webhook-name stripe-payment-webhook
# Output:
# Webhook: stripe-payment-webhook
# ID: webhoo_01JD3RZ9VX9W5
# URLs:
#   - https://webhook.heylua.ai/{agentId}/webhoo_01JD3RZ9VX9W5
#   - https://webhook.heylua.ai/{agentId}/stripe-payment-webhook
```

2. **In Stripe Dashboard (Test Mode):**
   - Developers → Webhooks
   - Add endpoint: `https://webhook.heylua.ai/{agentId}/stripe-payment-webhook`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Save

3. **Create test payment in Stripe Dashboard:**
   - Use card `4242 4242 4242 4242` (always succeeds)
   - Use card `4000 0000 0000 0002` (always fails)

4. **Monitor webhook logs:**

```bash
lua logs --webhook-name stripe-payment-webhook --tail 20
```

#### Shopify Sandbox Testing

1. **Get webhook URL:**

```bash
lua webhooks view --webhook-name shopify-order-webhook
```

2. **In Shopify Admin (Development Store):**
   - Settings → Notifications
   - Create webhook: `https://webhook.heylua.ai/{agentId}/shopify-order-webhook`
   - Topic: Orders → Order created
   - Format: JSON
   - Save

3. **Create test order in development store**

4. **Monitor logs:**

```bash
lua logs --webhook-name shopify-order-webhook
```

---

## Production Debugging

### Viewing Webhook Logs

```bash
# View all logs for a webhook
lua logs --webhook-name payment-webhook

# View last 50 lines
lua logs --webhook-name payment-webhook --tail 50

# View logs with timestamps
lua logs --webhook-name payment-webhook --format detailed

# Export logs to file
lua logs --webhook-name payment-webhook > webhook-logs.txt
```

### Webhook Execution Details

Check webhook metadata and version:

```bash
# View webhook info
lua webhooks view --webhook-name payment-webhook

# Output:
# Webhook: payment-webhook
# Description: Handle Stripe payment events
# Status: deployed
# Version: 1.0.5
# Created: 2025-01-10
# Last Updated: 2025-01-15T10:30:00Z
# 
# Deployed Versions:
#   1.0.5 (current) - deployed 2025-01-15
#   1.0.4 - deployed 2025-01-14
#   1.0.3 - deployed 2025-01-13
```

### Enabling Debug Logging

Add detailed logging in your webhook:

```typescript
import { LuaWebhook, Data } from 'lua-cli';

const debugWebhook = new LuaWebhook({
  name: 'debug-webhook',
  description: 'Webhook with debug logging',
  
  execute: async (event) => {
    // Log everything
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType: event.body?.type,
      query: event.query,
      headers: {
        'content-type': event.headers['content-type'],
        'user-agent': event.headers['user-agent']
      },
      bodySize: JSON.stringify(event.body).length,
      bodyKeys: Object.keys(event.body || {})
    };
    
    console.log('Webhook Debug:', JSON.stringify(logEntry, null, 2));
    
    // Store in Data API for retrieval
    await Data.create('webhook-debug-logs', logEntry, `${event.body?.type}-${Date.now()}`);
    
    try {
      // Process webhook...
      return { success: true };
    } catch (error) {
      console.error('Webhook error:', {
        message: error.message,
        stack: error.stack,
        eventType: event.body?.type
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
});

export default debugWebhook;
```

### Checking Webhook Status

```bash
# Get webhook deployment status
lua production status --webhook payment-webhook

# See version history
lua webhooks versions --webhook-name payment-webhook
```

---

## Common Issues & Solutions

### Issue: 401 Unauthorized Response

**Symptom:** Webhook logs show `401 Unauthorized` or `No authentication provided`

**Causes:**
- Missing or incorrect API key
- Expired authentication token
- Wrong webhook secret

**Solutions:**

```bash
# 1. Check if webhook is authenticated
lua auth configure  # Re-authenticate if needed

# 2. Verify API key is set
lua auth key

# 3. For external service authentication (e.g., Stripe):
lua env production get STRIPE_WEBHOOK_SECRET

# 4. If missing, set it:
lua env production set STRIPE_WEBHOOK_SECRET whsec_test_...
```

### Issue: 404 Not Found

**Symptom:** External service receives `404 Not Found` when calling webhook URL

**Causes:**
- Webhook not deployed
- Wrong webhook name/ID in URL
- Webhook deleted or deactivated

**Solutions:**

```bash
# 1. List all active webhooks
lua webhooks list

# 2. Verify webhook is deployed
lua webhooks view --webhook-name payment-webhook
# Check "Status: deployed"

# 3. Ensure correct URL format
# Use: https://webhook.heylua.ai/{agentId}/{webhook-name}
# Or: https://webhook.heylua.ai/{agentId}/{webhookId}

# 4. Redeploy if needed
lua push webhook --name payment-webhook --force
lua deploy webhook --name payment-webhook --force
```

### Issue: Webhook Not Triggering

**Symptom:** Webhook never executes; external service shows successful POST but no logs

**Causes:**
- Webhook URL not registered in external service
- Event type not subscribed
- External service sending to wrong URL
- Network connectivity issue

**Solutions:**

```bash
# 1. Verify webhook is reachable
curl -X POST https://webhook.heylua.ai/{agentId}/payment-webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"test","data":{}}'

# 2. Check logs for any activity
lua logs --webhook-name payment-webhook

# 3. Verify webhook URL in external service matches exactly
lua webhooks view --webhook-name payment-webhook
# Copy URL and verify in Stripe/Shopify/GitHub settings

# 4. Test webhook manually
lua test webhook --name payment-webhook --input '{"query":{},"headers":{},"body":{"type":"test"}}'
```

### Issue: Timeout (> 30 seconds)

**Symptom:** Webhook execution times out; external service receives `408` or `504`

**Causes:**
- Long-running operations in webhook handler
- Database queries too slow
- External API calls taking too long
- Synchronous processing instead of queuing

**Solutions:**

```typescript
// ❌ Bad: Long operation in webhook
execute: async (event) => {
  for (let i = 0; i < 1000000; i++) {
    await processItem(i);  // Times out!
  }
  return { success: true };
}

// ✅ Good: Queue work, return quickly
import { Jobs } from 'lua-cli';

execute: async (event) => {
  // Quick validation
  if (!isValid(event.body)) {
    return { error: 'Invalid payload' };
  }
  
  // Queue async job
  await Jobs.create({
    name: `process-${event.body.type}`,
    execute: async () => {
      for (let i = 0; i < 1000000; i++) {
        await processItem(i);
      }
    }
  });
  
  return { received: true, queued: true };  // Return immediately
}
```

### Issue: Duplicate Processing

**Symptom:** Same event processed multiple times; duplicate notifications sent

**Causes:**
- External service retrying failed requests
- Webhook deployed multiple times
- No idempotency check

**Solutions:**

```typescript
import { Data } from 'lua-cli';

execute: async (event) => {
  const { body } = event;
  const eventId = body?.id || body?.event_id;
  
  if (!eventId) {
    console.warn('No event ID in payload');
    return { error: 'No event ID' };
  }
  
  // Check if already processed
  const processed = await Data.get('processed-events', eventId);
  if (processed) {
    console.log(`Event ${eventId} already processed`);
    return { already_processed: true };
  }
  
  try {
    // Process event...
    
    // Mark as processed AFTER success
    await Data.create('processed-events', {
      processedAt: new Date().toISOString(),
      eventType: body?.type
    }, eventId);
    
    return { success: true };
  } catch (error) {
    // Don't mark as processed if error
    console.error('Processing error:', error);
    return { success: false, error: error.message };
  }
}
```

### Issue: Invalid Signature

**Symptom:** Webhook handler rejects request with "Invalid signature"

**Causes:**
- Signature calculation algorithm mismatch
- Wrong secret key used
- Request body modified before verification

**Solutions:**

```typescript
import { createHmac } from 'crypto';

// ❌ Wrong: Verifying parsed JSON (already modified)
execute: async (event) => {
  const signature = event.headers['stripe-signature'];
  const isValid = verifySignature(JSON.stringify(event.body), signature, secret);
}

// ✅ Right: Verify raw body before parsing
// Must receive raw request body, not parsed JSON
execute: async (event) => {
  const signature = event.headers['stripe-signature'];
  const rawBody = event.rawBody;  // If available
  const isValid = verifySignature(rawBody, signature, secret);
}
```

### Issue: Out of Memory

**Symptom:** Webhook crashes; logs show memory error

**Causes:**
- Processing very large payloads
- Memory leak in webhook handler
- No pagination for large datasets

**Solutions:**

```typescript
// ❌ Bad: Load entire dataset into memory
execute: async (event) => {
  const items = event.body.items;  // Could be millions
  const results = items.map(item => processItem(item));
}

// ✅ Good: Stream or batch process
execute: async (event) => {
  const items = event.body.items;
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(processItem));
    
    // Process results, then discard
    await saveBatchResults(results);
  }
  
  return { success: true, processed: items.length };
}
```

---

## Monitoring & Alerts

### Webhook Metrics

Track key metrics for production webhooks:

```typescript
import { Data } from 'lua-cli';

const webhookMetrics = {
  totalExecutions: 0,
  successCount: 0,
  errorCount: 0,
  averageLatency: 0,
  maxLatency: 0
};

const monitoredWebhook = new LuaWebhook({
  name: 'monitored-webhook',
  description: 'Webhook with monitoring',
  
  execute: async (event) => {
    const startTime = Date.now();
    
    try {
      // Your webhook logic
      await processWebhook(event);
      
      const latency = Date.now() - startTime;
      
      // Record success
      await Data.create('webhook-metrics', {
        timestamp: new Date().toISOString(),
        webhook: 'monitored-webhook',
        status: 'success',
        latency: latency,
        eventType: event.body?.type
      }, `success-${Date.now()}`);
      
      return { success: true, latency };
      
    } catch (error) {
      const latency = Date.now() - startTime;
      
      // Record error
      await Data.create('webhook-metrics', {
        timestamp: new Date().toISOString(),
        webhook: 'monitored-webhook',
        status: 'error',
        latency: latency,
        error: error.message,
        eventType: event.body?.type
      }, `error-${Date.now()}`);
      
      return { success: false, error: error.message };
    }
  }
});

export default monitoredWebhook;
```

### Health Checks

Add a health check webhook:

```typescript
const healthCheckWebhook = new LuaWebhook({
  name: 'health-check',
  description: 'Health check endpoint',
  
  execute: async (event) => {
    const checks = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {
        dataApi: await checkDataApi(),
        userApi: await checkUserApi(),
        deployment: 'deployed'
      }
    };
    
    return checks;
  }
});

async function checkDataApi(): Promise<string> {
  try {
    await Data.get('health-checks', 'test');
    return 'ok';
  } catch {
    return 'failed';
  }
}

async function checkUserApi(): Promise<string> {
  try {
    await User.get('test_user');
    return 'ok';
  } catch {
    return 'failed';
  }
}

export default healthCheckWebhook;
```

Periodically check:

```bash
curl https://webhook.heylua.ai/{agentId}/health-check

# Output:
# {
#   "timestamp": "2025-01-15T10:30:00Z",
#   "status": "healthy",
#   "checks": {
#     "dataApi": "ok",
#     "userApi": "ok",
#     "deployment": "deployed"
#   }
# }
```

---

## Performance Optimization

### Caching

Reduce API calls with caching:

```typescript
import { Data } from 'lua-cli';

const CACHE_TTL = 3600000; // 1 hour

async function getCachedUser(userId: string) {
  const cacheKey = `user-cache:${userId}`;
  
  // Try cache first
  const cached = await Data.get('cache', cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.user;
  }
  
  // Fetch if not cached
  const user = await User.get(userId);
  
  // Store in cache
  await Data.create('cache', {
    user: user,
    timestamp: Date.now()
  }, cacheKey);
  
  return user;
}

const cachedWebhook = new LuaWebhook({
  name: 'cached-webhook',
  
  execute: async (event) => {
    const { userId } = event.body;
    const user = await getCachedUser(userId);  // Use cache
    
    return { success: true };
  }
});
```

### Batching

Batch operations to reduce latency:

```typescript
import { User } from 'lua-cli';

const batchWebhook = new LuaWebhook({
  name: 'batch-webhook',
  
  execute: async (event) => {
    const { userIds, message } = event.body;
    
    // Send to multiple users in parallel
    const results = await Promise.all(
      userIds.map(userId =>
        User.get(userId).then(user =>
          user.send([{ type: 'text', text: message }])
        ).catch(error => ({ userId, error: error.message }))
      )
    );
    
    const successful = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;
    
    return {
      success: true,
      sent: successful,
      failed: failed
    };
  }
});
```

---

## Webhook Management

### Versioning Strategy

Use semantic versioning for webhooks:

```bash
# Bug fix
lua push webhook --set-version 1.0.1

# New feature
lua push webhook --set-version 1.1.0

# Breaking change
lua push webhook --set-version 2.0.0
```

### Gradual Rollout

Deploy new versions cautiously:

```bash
# Deploy new version to staging
lua deploy webhook --name payment-webhook --set-version 2.0.0

# Test thoroughly
lua chat  # Test manually

# Monitor logs
lua logs --webhook-name payment-webhook --tail 100

# If stable, keep it; if issues, rollback:
lua deploy webhook --name payment-webhook --set-version 1.0.5
```

### Rollback

Revert to previous version:

```bash
# View version history
lua webhooks versions --webhook-name payment-webhook

# Rollback to specific version
lua deploy webhook --name payment-webhook --set-version 1.0.5 --force
```

---

## Security Hardening

### Input Validation

Validate all incoming data:

```typescript
import { z } from 'zod';

const paymentSchema = z.object({
  type: z.literal('payment_intent.succeeded'),
  data: z.object({
    object: z.object({
      amount: z.number().positive(),
      currency: z.string().length(3),
      metadata: z.object({
        customerId: z.string(),
        orderId: z.string()
      })
    })
  })
});

const strictWebhook = new LuaWebhook({
  name: 'strict-webhook',
  
  execute: async (event) => {
    try {
      const validated = paymentSchema.parse(event.body);
      // Process validated data...
      return { success: true };
    } catch (error) {
      console.error('Validation error:', error.errors);
      return { success: false, error: 'Invalid payload' };
    }
  }
});
```

### Rate Limiting

Prevent abuse with rate limiting:

```typescript
import { Data } from 'lua-cli';

const RATE_LIMIT = { requests: 100, window: 60000 }; // 100/min

async function checkRateLimit(clientId: string): Promise<boolean> {
  const key = `rate_limit:${clientId}`;
  const bucket = await Data.get('rate-limits', key);
  
  if (!bucket) {
    // First request in window
    await Data.create('rate-limits', { count: 1 }, key);
    // Auto-expire after window
    setTimeout(() => Data.delete('rate-limits', key), RATE_LIMIT.window);
    return true;
  }
  
  if (bucket.count >= RATE_LIMIT.requests) {
    return false; // Rate limited
  }
  
  // Increment counter
  await Data.update('rate-limits', key, { count: bucket.count + 1 });
  return true;
}

const rateLimitedWebhook = new LuaWebhook({
  name: 'rate-limited-webhook',
  
  execute: async (event) => {
    const clientId = event.headers['x-client-id'];
    
    if (!await checkRateLimit(clientId)) {
      return {
        success: false,
        error: 'Rate limit exceeded',
        status: 429
      };
    }
    
    // Process webhook...
  }
});
```

### Signature Verification

Always verify webhook signatures:

```typescript
import { createHmac } from 'crypto';

function verifyStripeSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const [timestamp, v1Signature] = signature.split(',');
  
  const signedContent = `${timestamp}.${body}`;
  const expectedSignature = createHmac('sha256', secret)
    .update(signedContent)
    .digest('hex');
  
  // Constant-time comparison to prevent timing attacks
  return constantTimeCompare(v1Signature, expectedSignature);
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

const secureWebhook = new LuaWebhook({
  name: 'secure-webhook',
  
  execute: async (event) => {
    const signature = event.headers['stripe-signature'];
    const secret = env('STRIPE_WEBHOOK_SECRET');
    
    if (!verifyStripeSignature(JSON.stringify(event.body), signature, secret)) {
      return {
        success: false,
        error: 'Invalid signature',
        status: 401
      };
    }
    
    // Process webhook...
  }
});
```

---

## Operational Checklists

### Pre-Deployment Checklist

- [ ] Unit tests pass
- [ ] Integration tests with test payloads pass
- [ ] Logging implemented for debugging
- [ ] Error handling covers all cases
- [ ] Input validation implemented
- [ ] Rate limiting configured
- [ ] Secrets stored in environment variables
- [ ] Documentation updated
- [ ] Signature verification implemented (if needed)
- [ ] Idempotency check implemented

### Post-Deployment Checklist

- [ ] Webhook deployed successfully
- [ ] Logs show successful executions
- [ ] External service configured with correct webhook URL
- [ ] Health check passes
- [ ] Test event processed correctly
- [ ] User notifications sent correctly
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented

### Incident Response

If webhook fails in production:

1. **Immediate (< 5 min):**
   - Check logs: `lua logs --webhook-name <name>`
   - Verify webhook is still deployed
   - Check external service connectivity

2. **Short-term (5-30 min):**
   - Identify root cause
   - Rollback to last stable version if needed: `lua deploy webhook --set-version <version>`
   - Monitor for recovery

3. **Long-term (> 30 min):**
   - Fix root cause
   - Add monitoring/alerts to catch earlier
   - Post-incident review

---

## References

- **Lua Webhooks Docs:** https://docs.heylua.ai/overview/webhooks
- **LuaWebhook API:** https://docs.heylua.ai/api/luawebhook.md
- **Lua Logs Command:** https://docs.heylua.ai/cli/logs-command.md
- **Lua CLI Overview:** https://docs.heylua.ai/cli/overview.md

---

**Last Updated:** January 2025  
**Version:** 1.0.0
