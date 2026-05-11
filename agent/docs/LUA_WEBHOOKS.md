# Lua Webhooks Guide

HTTP endpoints for receiving external events and integrations. This guide covers webhook architecture, implementation, testing, and integration with the Lua platform.

**Reference:** https://docs.heylua.ai/overview/webhooks

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Architecture & Lifecycle](#architecture--lifecycle)
4. [Implementation](#implementation)
5. [Event Types & Subscriptions](#event-types--subscriptions)
6. [API Reference](#api-reference)
7. [Common Integrations](#common-integrations)
8. [Deployment & Management](#deployment--management)
9. [Testing & Debugging](#testing--debugging)
10. [Security Best Practices](#security-best-practices)
11. [Integration with VERA](#integration-with-vera)

---

## Overview

Webhooks are HTTP endpoints that allow external services to send events to your Lua agent. When something happens in an external system (like a payment completing or an order shipping), that system can notify your agent in real-time.

### What are Webhooks?

Think of a webhook as **a phone number for your agent** — external services can "call" it when events happen.

**Key Characteristics:**
- **HTTP-based**: External services POST JSON payloads to your webhook URL
- **Event-driven**: Respond to real-world events instantly
- **Context-less**: Execute outside of user conversations (no automatic user context)
- **Asynchronous**: Long-running work should be delegated to Jobs
- **Production-ready**: Built-in since Lua v3.0.0

### Why Webhooks?

✅ **Real-Time Events** — Get notified instantly when events happen in external systems  
✅ **Automated Actions** — Respond to external events without user interaction  
✅ **Seamless Integration** — Connect with Stripe, Shopify, GitHub, and any webhook-enabled service  
✅ **Event-Driven** — Build reactive agents that respond to real-world events  

---

## Core Concepts

### The Webhook Flow

1. **External Event Occurs**  
   Something happens: payment completes, order ships, PR merges, etc.

2. **Service Sends HTTP Request**  
   The external service (Stripe, Shopify) sends a POST request to your webhook URL

3. **Your Webhook Receives Event**  
   Your `LuaWebhook`'s `execute` function is called with the event data

4. **Your Code Takes Action**  
   Process the event: update orders, notify users, trigger jobs, etc.

5. **Return Response**  
   Return acknowledgment to the external service

### Context & User Access

⚠️ **Critical:** Webhooks execute **outside of conversational context**. Unlike tools and skills which have automatic user context, webhooks are triggered by external systems.

| Context   | How to Get User        | userId Required?             |
|-----------|------------------------|------------------------------|
| Webhooks  | `User.get(userId)`     | ✅ **YES** — Store in metadata|
| Tools     | `User.get()`           | ❌ No — automatic context    |
| Jobs      | `User.get(userId)`     | ✅ **YES** — Store in metadata|

**Key Strategy:** Always store the Lua user ID in your payment/order metadata when creating transactions. Example:

```typescript
// When creating a payment in Stripe
metadata: {
  customerId: luaUserId,  // Store the Lua user ID
  orderId: orderId,
  timestamp: Date.now()
}
```

Then in your webhook, retrieve the user:

```typescript
const customerId = event.body?.metadata?.customerId;
const user = await User.get(customerId);
await user.send([{ type: 'text', text: '✅ Payment confirmed!' }]);
```

### No Conversational Context

Webhooks have NO conversational context:
- No conversation history
- No automatic user identification
- No session state
- You MUST explicitly provide `userId` to `User.get()`

This is by design — webhooks are triggered by external systems, not users chatting.

---

## Architecture & Lifecycle

### Webhook Lifecycle

```
Create → Deploy → Subscribe → Receive → Process → Respond
```

#### 1. Create

Define a webhook in TypeScript:

```typescript
import { LuaWebhook, User } from 'lua-cli';

const paymentWebhook = new LuaWebhook({
  name: 'payment-webhook',
  description: 'Handle Stripe payment events',
  execute: async (event) => {
    const { body } = event;
    // Process webhook...
    return { received: true };
  }
});

export default paymentWebhook;
```

#### 2. Deploy

Push and deploy your webhook:

```bash
lua push webhook --name payment-webhook
lua deploy webhook --name payment-webhook
```

#### 3. Subscribe (Optional)

Subscribe to platform events (e.g., WhatsApp message delivery):

```bash
lua webhooks subscribe --webhook-name payment-webhook --event message.delivered
```

#### 4. Receive

External service sends a POST request to your webhook URL:

```
POST https://webhook.heylua.ai/{agentId}/{webhook-name}
Content-Type: application/json

{
  "type": "payment_intent.succeeded",
  "data": { ... }
}
```

#### 5. Process

Your `execute` function processes the event:

```typescript
execute: async (event) => {
  const { body } = event;
  if (body?.type === 'payment_intent.succeeded') {
    // Handle payment success
  }
}
```

#### 6. Respond

Return status to the external service:

```typescript
return { success: true, processed: true };
```

### Webhook URLs

After deploying, your webhook is accessible via:

```
https://webhook.heylua.ai/{agentId}/{webhookId}       // UUID
https://webhook.heylua.ai/{agentId}/{webhook-name}    // Friendly name
```

**Examples:**

```
https://webhook.heylua.ai/agent_abc123/webhoo_01JD3RZ9VX9W5
https://webhook.heylua.ai/agent_abc123/payment-webhook
```

Use either URL in your external service's webhook settings.

---

## Implementation

### Basic Structure

Every webhook receives a `WebhookEvent` object:

```typescript
interface WebhookEvent {
  query: Record<string, any>;      // URL query parameters
  headers: Record<string, any>;    // HTTP headers
  body: any;                       // JSON payload
  timestamp: string;               // ISO timestamp
}
```

### Simple Example

```typescript
import { LuaWebhook, User } from 'lua-cli';

const paymentWebhook = new LuaWebhook({
  name: 'payment-webhook',
  description: 'Handle Stripe payment events',
  
  execute: async (event) => {
    const { body } = event;
    
    if (body?.type === 'payment_intent.succeeded') {
      // ⚠️ Webhooks have NO conversational context
      // You MUST provide userId to User.get()
      
      // Get user ID from payment metadata
      const customerId = body.data?.object?.metadata?.customerId;
      
      if (!customerId) {
        console.error('No customerId in payment metadata');
        return { received: true, error: 'No customer ID' };
      }
      
      // Retrieve specific user by ID
      const user = await User.get(customerId);
      
      // Send payment confirmation to that user
      await user.send([{
        type: 'text',
        text: `✅ Payment confirmed! Amount: $${body.data.object.amount/100} ${body.data.object.currency.toUpperCase()}`
      }]);
    }
    
    return { received: true };
  }
});

export default paymentWebhook;
```

### Adding Webhooks to Your Agent

Webhooks are added to your `LuaAgent` configuration in `src/index.ts`:

```typescript
import { LuaAgent } from 'lua-cli';
import paymentWebhook from './webhooks/payment';
import orderWebhook from './webhooks/order';

export const agent = new LuaAgent({
  name: "my-agent",
  persona: "...",
  skills: [...],
  
  // Add webhooks here
  webhooks: [
    paymentWebhook,
    orderWebhook
  ]
});
```

### Configuration Parameters

#### Required Fields

- **`name`** (string): Unique webhook name
  - Format: lowercase, hyphens, underscores
  - Examples: `'payment-webhook'`, `'order-update-webhook'`

- **`execute`** (function): Handler for incoming events
  - Signature: `(event: WebhookEvent) => Promise<any>`
  - Must handle async operations
  - Should return quickly (< 5 seconds)

#### Optional Fields

- **`description`** (string): Documentation for the webhook

### Error Handling

```typescript
const robustWebhook = new LuaWebhook({
  name: 'robust-webhook',
  
  execute: async (event) => {
    try {
      const result = await processWebhook(event);
      
      return {
        success: true,
        result,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      // Log error for debugging
      console.error('Webhook error:', {
        error: error.message,
        stack: error.stack
      });
      
      // Return error status (don't throw!)
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
});
```

---

## Event Types & Subscriptions

### Platform Events

Webhooks can subscribe to **platform events** — real-time notifications from Lua's messaging channels.

#### Available Event Types

Currently supported for WhatsApp message delivery tracking:

| Event              | Trigger                                    | Channel  |
|--------------------|---------------------------------------------|----------|
| `message.sent`     | Message was sent to the recipient          | WhatsApp |
| `message.delivered`| Message was delivered to recipient's device| WhatsApp |
| `message.read`     | Recipient read the message                 | WhatsApp |
| `message.failed`   | Message failed to send                     | WhatsApp |
| `message.played`   | Recipient played a voice/video message    | WhatsApp |

#### Subscribing to Events

```bash
# List all available event types
lua webhooks list-events

# Subscribe a webhook to an event
lua webhooks subscribe --webhook-name delivery-tracker --event message.delivered

# Subscribe to multiple events
lua webhooks subscribe --webhook-name delivery-tracker --event message.delivered
lua webhooks subscribe --webhook-name delivery-tracker --event message.read

# Unsubscribe from an event
lua webhooks unsubscribe --webhook-name delivery-tracker --event message.delivered
```

#### Event Payload Shape

When an event fires, your webhook receives a `WebhookEvent` where `body` contains:

```typescript
interface MessageStatusEvent {
  eventType: string;
  agentId: string;
  messageWamid: string;              // Unique message ID
  recipientId: string;               // Phone number
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'played';
  channel: 'whatsapp';
  phoneNumberId: string;
  timestamp: string;
  conversation?: {
    id: string;
    origin: { type: string };
    expiration_timestamp?: string;
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
  errors?: Array<{
    code: number;
    title: string;
    message?: string;
  }>;
}
```

#### Example: Delivery Tracking

```typescript
import { LuaWebhook, Data } from 'lua-cli';

const deliveryTracker = new LuaWebhook({
  name: 'delivery-tracker',
  description: 'Track WhatsApp message delivery status',
  
  execute: async (event) => {
    const { body } = event;
    const { eventType, recipientId, status, messageWamid } = body;
    
    // Store delivery event in custom data
    await Data.create('delivery-events', {
      messageId: messageWamid,
      recipient: recipientId,
      status: status,
      eventType: eventType,
      trackedAt: new Date().toISOString()
    }, `${status} - ${recipientId}`);
    
    if (status === 'failed') {
      console.error(`Message ${messageWamid} failed for ${recipientId}`);
    }
    
    return { received: true };
  }
});

export default deliveryTracker;
```

---

## API Reference

### LuaWebhook Constructor

```typescript
new LuaWebhook(config: LuaWebhookConfig)
```

Creates a new webhook endpoint.

**Configuration Object:**

```typescript
interface LuaWebhookConfig {
  name: string;                                    // Required: webhook name
  description?: string;                           // Optional: documentation
  execute: (event: WebhookEvent) => Promise<any>; // Required: event handler
}
```

**Example:**

```typescript
const myWebhook = new LuaWebhook({
  name: 'custom-webhook',
  description: 'Handle custom service events',
  execute: async (event) => {
    // Process event
    return { success: true };
  }
});
```

### WebhookEvent

```typescript
interface WebhookEvent {
  query: Record<string, any>;      // URL query parameters
  headers: Record<string, any>;    // HTTP headers (lowercase keys)
  body: any;                       // JSON payload from external service
  timestamp: string;               // ISO 8601 timestamp
}
```

**Usage:**

```typescript
execute: async (event) => {
  const { query, headers, body, timestamp } = event;
  
  // Access query parameters
  console.log(event.query.source);
  
  // Access headers
  console.log(event.headers['x-signature']);
  
  // Access body payload
  console.log(event.body.type);
  
  // Use timestamp for logging
  console.log(`Event received at ${event.timestamp}`);
}
```

---

## Common Integrations

### Stripe Payments

**Webhook Events:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `invoice.payment_succeeded`

**Setup:**
1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://webhook.heylua.ai/{agentId}/stripe-payment-webhook`
3. Select events to subscribe to

**Implementation:**

```typescript
import { LuaWebhook, env, Orders, User } from 'lua-cli';

const stripeWebhook = new LuaWebhook({
  name: 'stripe-payment-webhook',
  description: 'Handle Stripe payment events',
  
  execute: async (event) => {
    const { body } = event;
    console.log('Stripe event:', body?.type);
    
    switch (body?.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = body.data?.object;
        
        // Update order status
        const order = await Orders.getById(paymentIntent.metadata.orderId);
        if (order) {
          await order.updateStatus('CONFIRMED');
          
          // Get user by ID from payment metadata
          const customerId = paymentIntent.metadata.customerId;
          const user = await User.get(customerId);
          
          // Notify the specific user
          await user.send([{
            type: 'text',
            text: `✅ Payment confirmed! Order #${order.id} is being processed. Amount: $${paymentIntent.amount/100}`
          }]);
        }
        
        return { success: true, orderId: order?.id };
        
      case 'payment_intent.payment_failed':
        const failed = body.data?.object;
        console.error('Payment failed:', failed);
        
        // Notify user of failure
        const failedCustomerId = failed.metadata.customerId;
        if (failedCustomerId) {
          const user = await User.get(failedCustomerId);
          await user.send([{
            type: 'text',
            text: `❌ Payment failed: ${failed.last_payment_error?.message}. Please try again.`
          }]);
        }
        
        return { success: false, reason: failed.last_payment_error?.message };
        
      default:
        console.log('Unhandled event type:', body?.type);
        return { received: true };
    }
  }
});

export default stripeWebhook;
```

**⚠️ Important:** Always store the user ID (customerId) in your payment metadata:

```typescript
// When creating a Stripe payment
const payment = await stripe.paymentIntents.create({
  amount: 2000,
  currency: 'usd',
  metadata: {
    customerId: luaUserId,  // Store Lua user ID
    orderId: orderId
  }
});
```

### Shopify Orders

**Webhook Topics:**
- `orders/create`
- `orders/updated`
- `orders/deleted`
- `products/create`
- `products/updated`
- `products/delete`

**Setup:**
1. Shopify Admin → Settings → Notifications
2. Create webhook endpoint
3. Enter webhook URL: `https://webhook.heylua.ai/{agentId}/shopify-order-webhook`
4. Select events

**Implementation:**

```typescript
import { LuaWebhook, env, Data, User } from 'lua-cli';

const shopifyOrderWebhook = new LuaWebhook({
  name: 'shopify-order-webhook',
  description: 'Handle Shopify order events',
  
  execute: async (event) => {
    const { body } = event;
    const order = body;
    
    // Store order in custom data
    await Data.create('shopify-orders', {
      orderId: order.id,
      orderNumber: order.order_number,
      customer: order.customer,
      total: order.total_price,
      items: order.line_items,
      status: order.financial_status,
      customerId: order.customer.id,  // Store customer ID
      createdAt: order.created_at
    }, `Order #${order.order_number} ${order.customer.email} ${order.total_price}`);
    
    // Notify specific customer using their ID
    const user = await User.get(order.customer.id);
    await user.send([{
      type: 'text',
      text: `🛍️ Order #${order.order_number} confirmed!\n\nTotal: $${order.total_price}\nItems: ${order.line_items.length}\n\nWe'll send shipping updates soon!`
    }]);
    
    return {
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      customerId: order.customer.id
    };
  }
});

export default shopifyOrderWebhook;
```

### GitHub Deployments

**Webhook Events:**
- `push`
- `pull_request`
- `deployment_status`
- `release`

**Setup:**
1. Repository → Settings → Webhooks → Add webhook
2. Payload URL: `https://webhook.heylua.ai/{agentId}/github-deployment-webhook`
3. Content type: `application/json`
4. Select events to trigger

**Implementation:**

```typescript
import { LuaWebhook, env } from 'lua-cli';

const githubWebhook = new LuaWebhook({
  name: 'github-deployment-webhook',
  description: 'Track GitHub deployment events',
  
  execute: async (event) => {
    const { body } = event;
    const payload = body;
    
    if (payload?.action === 'deployment_status') {
      const status = payload.deployment_status;
      const deployment = payload.deployment;
      
      console.log('Deployment event:', {
        environment: deployment.environment,
        state: status.state,
        url: status.target_url
      });
      
      if (status.state === 'success') {
        console.log('✅ Deployment successful to', deployment.environment);
      } else if (status.state === 'failure') {
        console.error('❌ Deployment failed to', deployment.environment);
      }
      
      return { success: true, state: status.state };
    }
    
    return { received: true };
  }
});

export default githubWebhook;
```

### Custom Integrations

For any webhook-enabled service:

```typescript
import { LuaWebhook, env } from 'lua-cli';

const customWebhook = new LuaWebhook({
  name: 'custom-integration-webhook',
  description: 'Handle events from custom service',
  
  execute: async (event) => {
    const { query, headers, body } = event;
    
    try {
      // Validate event structure
      if (!body || !body.type) {
        throw new Error('Invalid event structure');
      }
      
      // Log event for debugging
      console.log('Received webhook:', {
        type: body.type,
        timestamp: new Date().toISOString(),
        dataKeys: Object.keys(body.data || {})
      });
      
      // Process event based on type
      switch (body.type) {
        case 'resource.created':
          await handleCreate(body.data);
          break;
          
        case 'resource.updated':
          await handleUpdate(body.data);
          break;
          
        case 'resource.deleted':
          await handleDelete(body.data);
          break;
          
        default:
          console.log('Unknown event type:', body.type);
      }
      
      return { success: true, processed: body.type };
      
    } catch (error) {
      console.error('Webhook processing error:', error);
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
});

async function handleCreate(data: any) {
  console.log('Resource created:', data.id);
}

async function handleUpdate(data: any) {
  console.log('Resource updated:', data.id);
}

async function handleDelete(data: any) {
  console.log('Resource deleted:', data.id);
}

export default customWebhook;
```

---

## Deployment & Management

### Pushing a Webhook

```bash
# Interactive mode
lua push webhook

# Direct mode (faster)
lua push webhook --name payment-webhook

# With version
lua push webhook --name payment-webhook --set-version 2.0.0

# Push and deploy immediately
lua push webhook --force --auto-deploy
```

### Deploying a Webhook

```bash
# Interactive mode
lua deploy webhook

# Direct mode
lua deploy webhook --name payment-webhook

# Deploy specific version
lua deploy webhook --name payment-webhook --set-version 1.0.5

# Deploy latest
lua deploy webhook --name payment-webhook --set-version latest

# Deploy all at once
lua deploy all --force
```

### Viewing Deployed Webhooks

```bash
# View webhook details (shows both URLs)
lua webhooks view --webhook-name payment-webhook

# View all webhooks
lua webhooks list
```

### Webhook Versioning

Use semantic versioning:

```bash
Current: 1.0.0 → Suggests: 1.0.1 (patch - bug fixes)
Current: 1.0.0 → You set: 1.1.0 (minor - new features)
Current: 1.0.0 → You set: 2.0.0 (major - breaking changes)
```

### Environment Variables

Webhooks can access environment variables securely:

```typescript
import { env } from 'lua-cli';

const apiKey = env('STRIPE_API_KEY');
const webhookSecret = env('STRIPE_WEBHOOK_SECRET');
```

Set environment variables for different stages:

```bash
# Sandbox
lua env sandbox set STRIPE_API_KEY sk_test_...

# Production
lua env production set STRIPE_API_KEY sk_live_...
```

---

## Testing & Debugging

### Local Testing

```bash
lua test
# Select: Webhook → your-webhook-name
# Provide test payload
```

### Test Payloads

#### Stripe Test Payload

```json
{
  "id": "evt_1234567890",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_test_123",
      "amount": 2000,
      "currency": "usd",
      "status": "succeeded",
      "metadata": {
        "orderId": "order_456",
        "customerId": "user_789"
      }
    }
  }
}
```

#### Shopify Test Payload

```json
{
  "id": 123456789,
  "order_number": "1001",
  "total_price": "99.99",
  "currency": "USD",
  "financial_status": "paid",
  "customer": {
    "id": "user_123",
    "email": "customer@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "line_items": [
    {
      "id": "item_1",
      "product_id": "prod_1",
      "title": "Product Name",
      "quantity": 1,
      "price": "99.99"
    }
  ]
}
```

#### GitHub Test Payload

```json
{
  "action": "deployment_status",
  "deployment": {
    "id": 123456,
    "environment": "production",
    "ref": "main",
    "created_at": "2025-01-15T10:00:00Z"
  },
  "deployment_status": {
    "id": 987654,
    "state": "success",
    "target_url": "https://example.com",
    "created_at": "2025-01-15T10:05:00Z"
  }
}
```

### Debugging Tips

1. **Enable Logging:**

```typescript
execute: async (event) => {
  console.log('Webhook received:', {
    type: event.body?.type,
    timestamp: event.timestamp,
    headers: Object.keys(event.headers),
    body: JSON.stringify(event.body, null, 2)
  });
  
  // Process...
}
```

2. **Check Logs:**

```bash
lua logs --webhook-name payment-webhook
lua logs --webhook-name payment-webhook --tail 50
```

3. **Validate Signatures:**

For services like Stripe that send signatures:

```typescript
import { createHmac } from 'crypto';

execute: async (event) => {
  const signature = event.headers['stripe-signature'];
  const secret = env('STRIPE_WEBHOOK_SECRET');
  
  // Verify signature (implementation depends on service)
  const isValid = verifySignature(event.body, signature, secret);
  
  if (!isValid) {
    console.error('Invalid signature');
    return { error: 'Invalid signature' };
  }
  
  // Process webhook...
}
```

4. **Use Data API for Diagnostics:**

```typescript
import { Data } from 'lua-cli';

execute: async (event) => {
  // Log every webhook for debugging
  await Data.create('webhook-logs', {
    type: event.body?.type,
    timestamp: event.timestamp,
    payload: event.body,
    status: 'received'
  }, `${event.body?.type} ${event.timestamp}`);
  
  // Process...
}
```

---

## Security Best Practices

### 1. Use Environment Variables

Never hardcode secrets:

```typescript
// ❌ Bad
secret: 'hardcoded_secret_key'

// ✅ Good
import { env } from 'lua-cli';
secret: env('STRIPE_WEBHOOK_SECRET')
```

### 2. Validate Webhook Structure

Always validate incoming data:

```typescript
execute: async (event) => {
  const { body } = event;
  
  if (!body || !body.type) {
    throw new Error('Invalid webhook payload');
  }
  
  if (!body.data || typeof body.data !== 'object') {
    throw new Error('Missing or invalid data field');
  }
  
  // Process webhook...
}
```

### 3. Verify Signatures

For services like Stripe, always verify the request signature:

```typescript
import { createHmac } from 'crypto';

function verifyStripeSignature(body: string, signature: string, secret: string): boolean {
  const computedSignature = createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  return computedSignature === signature;
}

execute: async (event) => {
  const signature = event.headers['stripe-signature'];
  const secret = env('STRIPE_WEBHOOK_SECRET');
  const rawBody = event.body;  // Must be raw string, not parsed JSON
  
  if (!verifyStripeSignature(rawBody, signature, secret)) {
    return { error: 'Unauthorized' };
  }
  
  // Process...
}
```

### 4. Return Quickly

Webhook handlers should return fast (< 5 seconds):

```typescript
// ❌ Bad: Long-running work in webhook
execute: async (event) => {
  for (let i = 0; i < 1000000; i++) {
    await processItem(i);  // Too slow!
  }
}

// ✅ Good: Queue long-running work
import { Jobs } from 'lua-cli';

execute: async (event) => {
  const { body } = event;
  
  // Quick validation
  if (!isValid(body)) {
    return { error: 'Invalid' };
  }
  
  // Queue processing job
  await Jobs.create({
    name: 'process-webhook-data',
    execute: async () => {
      for (let i = 0; i < 1000000; i++) {
        await processItem(i);
      }
    }
  });
  
  return { received: true, queued: true };
}
```

### 5. Store User IDs in Metadata

Always include Lua user IDs in external service metadata:

```typescript
// When creating a Stripe payment
const payment = await stripe.paymentIntents.create({
  amount: 2000,
  currency: 'usd',
  metadata: {
    luaUserId: getUserIdFromContext(),  // Critical!
    orderId: orderId
  }
});

// In webhook
const luaUserId = event.body?.metadata?.luaUserId;
if (luaUserId) {
  const user = await User.get(luaUserId);
  await user.send([{ type: 'text', text: 'Payment confirmed!' }]);
}
```

### 6. Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
import { Data } from 'lua-cli';

const RATE_LIMIT = 100;  // requests per minute
const RATE_WINDOW = 60000; // 1 minute in ms

async function checkRateLimit(id: string): Promise<boolean> {
  const key = `rate_limit:${id}`;
  const count = await Data.get('rate-limits', key);
  
  if (!count) {
    await Data.create('rate-limits', { count: 1 }, key);
    setTimeout(() => Data.delete('rate-limits', key), RATE_WINDOW);
    return true;
  }
  
  if (count.count >= RATE_LIMIT) {
    return false;
  }
  
  await Data.update('rate-limits', key, { count: count.count + 1 });
  return true;
}

execute: async (event) => {
  const clientId = event.body?.client_id || event.headers['x-client-id'];
  
  if (!await checkRateLimit(clientId)) {
    return { error: 'Rate limit exceeded' };
  }
  
  // Process webhook...
}
```

### 7. Idempotency

Handle duplicate webhook deliveries gracefully:

```typescript
import { Data } from 'lua-cli';

execute: async (event) => {
  const { body } = event;
  const eventId = body?.id;
  
  // Check if we've already processed this event
  const processed = await Data.get('processed-webhooks', eventId);
  if (processed) {
    return { already_processed: true };
  }
  
  // Process webhook...
  
  // Mark as processed
  await Data.create('processed-webhooks', { processedAt: new Date() }, eventId);
  
  return { success: true };
}
```

---

## Integration with VERA

### VERA Agent Intake Webhook

The VERA dashboard uses a webhook to forward transaction data to the Lua agent for analysis.

**Endpoint:**

```
POST https://whale-app-6npb9.ondigitalocean.app/api/v1/agent/intake
```

**Purpose:**
- Accept transaction data from VERA dashboard alerts
- Forward to Lua agent webhook for STR analysis
- Return analysis report and optional STR draft

**Request Format:**

```json
{
  "data": "transaction_data_in_csv",
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

**Response Format:**

```json
{
  "success": true,
  "run_id": "run_xyz123",
  "analysis_status": "completed",
  "analysis": {
    "risk_score": 0.87,
    "findings": ["..."],
    "timestamp": "2025-01-15T10:30:00Z"
  },
  "report": {
    "content_text": "...",
    "summary": "..."
  },
  "str_draft_id": "str_abc123"
}
```

**Authentication:**

```
Headers:
  x-intake-key: <INTAKE_WEBHOOK_KEY>
  Authorization: Bearer <LUA_WEBHOOK_SECRET>
```

### Environment Configuration

**Required Variables:**

```bash
# In backend deployment (.env or platform settings)
LUA_TRANSACTION_INTAKE_WEBHOOK_URL=https://api.heylua.ai/developer/webhooks/baseAgent_agent_1776995296296_hwf4neyjk/e54c79d1-63dd-488e-b18c-c9f5c116b529
LUA_TRANSACTION_INTAKE_KEY=<shared-intake-key>
LUA_TRANSACTION_INTAKE_BEARER_TOKEN=<lua-api-token>
LUA_TRANSACTION_INTAKE_TIMEOUT_SECONDS=30
```

### Setting Up in Production

1. **Generate Intake Key:**

```bash
npx lua webhooks generate-key --webhook-name transaction-intake
```

2. **Deploy Webhook:**

```bash
npx lua push webhook --name transaction-intake
npx lua deploy webhook --name transaction-intake
```

3. **Configure Backend:**

```bash
# Get webhook URL
npx lua webhooks view --webhook-name transaction-intake

# Set in DigitalOcean App Platform settings
LUA_TRANSACTION_INTAKE_WEBHOOK_URL=<URL from above>
LUA_TRANSACTION_INTAKE_KEY=<generated key>
LUA_TRANSACTION_INTAKE_BEARER_TOKEN=<api token from npx lua auth key>
```

4. **Verify Connectivity:**

```bash
curl -X POST https://whale-app-6npb9.ondigitalocean.app/api/v1/agent/intake \
  -H "Content-Type: application/json" \
  -H "x-intake-key: <key>" \
  -H "Authorization: Bearer <token>" \
  -d '{"data":"test", "format":"csv"}'
```

Expected response: `200 OK` with `success: true` or payload validation error.

---

## References

- **Official Lua Webhooks Docs:** https://docs.heylua.ai/overview/webhooks
- **LuaWebhook API Reference:** https://docs.heylua.ai/api/luawebhook.md
- **Skill Management (Push/Deploy):** https://docs.heylua.ai/cli/skill-management.md
- **Lua CLI Reference:** https://docs.heylua.ai/cli/overview.md
- **Platform APIs:** https://docs.heylua.ai/concepts/platform-apis.md

## Related Documentation

- [QUICKSTART.md](../QUICKSTART.md) — Agent setup and deployment
- [README.md](../README.md) — Project overview
- [../src/index.ts](../src/index.ts) — Agent configuration

---

## Questions & Support

For issues or questions:
1. Check the [Lua Discord community](https://discord.gg/SRPEuwCzaD)
2. Review [Lua CLI troubleshooting](https://docs.heylua.ai/cli/troubleshooting.md)
3. Consult this guide's examples for your use case
