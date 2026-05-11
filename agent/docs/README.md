# Agent Documentation

Comprehensive documentation for the Lua agent implementation and webhook integration with VERA.

## Documentation Index

### 📚 Main Guides

#### [LUA_WEBHOOKS.md](./LUA_WEBHOOKS.md) — Complete Webhooks Guide
The definitive reference for Lua webhooks. Covers:
- Core concepts and architecture
- Webhook lifecycle (create → deploy → receive → process)
- API reference and configuration
- Integration examples (Stripe, Shopify, GitHub)
- Deployment and management
- Security best practices
- **VERA dashboard integration details**

**Best for:** Understanding webhooks deeply, implementing new integrations, production deployments

**Reading Time:** 45 minutes

---

#### [LUA_WEBHOOKS_TESTING.md](./LUA_WEBHOOKS_TESTING.md) — Testing & Debugging Guide
Complete guide for testing and debugging webhooks. Covers:
- Local testing with `lua test`
- Sandbox testing with real external services
- Production debugging with logs
- Common issues and solutions
- Monitoring and metrics
- Performance optimization
- Security hardening

**Best for:** Testing webhook implementations, diagnosing production issues, optimizing performance

**Reading Time:** 40 minutes

---

#### [LUA_WEBHOOKS_REFERENCE.md](./LUA_WEBHOOKS_REFERENCE.md) — Quick Reference
Fast lookup guide for webhook operations. Covers:
- Quick start (5-minute setup)
- Webhook event structure
- Common patterns with code examples
- CLI command reference
- Environment variables
- Signature verification
- Monitoring commands
- VERA integration summary

**Best for:** Quick lookups, common patterns, CLI commands, integration details

**Reading Time:** 10 minutes

---

### 🔗 Integration Points

#### VERA Dashboard & Agent Intake

The VERA dashboard integrates with the Lua agent through the **Agent Intake Webhook**:

```
VERA Dashboard
    ↓
Frontend: Click "Run Agent Intake" button
    ↓
Backend: POST /api/v1/agent/intake
    ↓
Backend Bridge: Forward to Lua webhook
    ↓
Lua Webhook: transaction-intake
    ↓
Lua Agent: Analyze transactions, generate report
    ↓
Response: { success, run_id, analysis, report, str_draft_id }
    ↓
Backend: Create STR draft from report
    ↓
Frontend: Redirect to /str/{str_draft_id}
```

**Documentation:** See [LUA_WEBHOOKS.md § Integration with VERA](./LUA_WEBHOOKS.md#integration-with-vera)

**Configuration:** See [LUA_WEBHOOKS_REFERENCE.md § VERA Dashboard Integration](./LUA_WEBHOOKS_REFERENCE.md#vera-dashboard-integration)

---

### 📖 Quick Navigation

**I want to...**

| Goal | Resource |
|------|----------|
| **Create a new webhook** | [LUA_WEBHOOKS_REFERENCE.md § Quick Start](./LUA_WEBHOOKS_REFERENCE.md#quick-start-create--deploy-webhook) |
| **Understand webhooks** | [LUA_WEBHOOKS.md § Core Concepts](./LUA_WEBHOOKS.md#core-concepts) |
| **Test my webhook** | [LUA_WEBHOOKS_TESTING.md § Local Testing](./LUA_WEBHOOKS_TESTING.md#local-testing) |
| **Debug webhook issues** | [LUA_WEBHOOKS_TESTING.md § Common Issues](./LUA_WEBHOOKS_TESTING.md#common-issues--solutions) |
| **Deploy to production** | [LUA_WEBHOOKS.md § Deployment & Management](./LUA_WEBHOOKS.md#deployment--management) |
| **Integrate with external service** | [LUA_WEBHOOKS.md § Common Integrations](./LUA_WEBHOOKS.md#common-integrations) |
| **Set up VERA integration** | [LUA_WEBHOOKS_REFERENCE.md § VERA Dashboard Integration](./LUA_WEBHOOKS_REFERENCE.md#vera-dashboard-integration) |
| **Verify webhook signature** | [LUA_WEBHOOKS_REFERENCE.md § Signature Verification](./LUA_WEBHOOKS_REFERENCE.md#signature-verification) |
| **Monitor webhook health** | [LUA_WEBHOOKS_TESTING.md § Monitoring & Alerts](./LUA_WEBHOOKS_TESTING.md#monitoring--alerts) |
| **Handle errors gracefully** | [LUA_WEBHOOKS.md § Error Handling](./LUA_WEBHOOKS.md#error-handling) |
| **Look up a CLI command** | [LUA_WEBHOOKS_REFERENCE.md § CLI Commands Reference](./LUA_WEBHOOKS_REFERENCE.md#cli-commands-reference) |
| **Find code examples** | [LUA_WEBHOOKS_REFERENCE.md § Common Patterns](./LUA_WEBHOOKS_REFERENCE.md#common-patterns) |

---

## Document Relationships

```
┌─────────────────────────────────────────────────────┐
│       LUA_WEBHOOKS.md (Complete Guide)              │
│  - Core concepts                                    │
│  - Architecture & lifecycle                        │
│  - API reference                                   │
│  - Common integrations                             │
│  - Deployment & management                         │
│  - Security best practices                         │
│  - VERA integration                                │
└─────────────────────────────────────────────────────┘
             ↙                            ↖
            /                              \
    ┌──────────────────────┐      ┌──────────────────────┐
    │ LUA_WEBHOOKS_        │      │ LUA_WEBHOOKS_        │
    │ TESTING.md           │      │ REFERENCE.md         │
    │                      │      │                      │
    │ - Local testing      │      │ - Quick start        │
    │ - Sandbox testing    │      │ - Common patterns    │
    │ - Debugging          │      │ - CLI reference      │
    │ - Monitoring         │      │ - Integration guide  │
    │ - Optimization       │      │ - Best practices     │
    └──────────────────────┘      └──────────────────────┘
         (40 min read)               (10 min read)
         Deep dive                   Quick lookup
```

---

## Learning Path

### Beginner: First Webhook

1. Read: [LUA_WEBHOOKS_REFERENCE.md § Quick Start](./LUA_WEBHOOKS_REFERENCE.md#quick-start-create--deploy-webhook)
2. Code: Create your first webhook following the pattern
3. Test: Use [LUA_WEBHOOKS_REFERENCE.md § Testing Webhooks](./LUA_WEBHOOKS_REFERENCE.md#testing-webhooks)
4. Deploy: Follow deployment steps in reference guide

**Time:** 15-30 minutes

### Intermediate: Full Implementation

1. Read: [LUA_WEBHOOKS.md § Core Concepts](./LUA_WEBHOOKS.md#core-concepts)
2. Read: [LUA_WEBHOOKS.md § Implementation](./LUA_WEBHOOKS.md#implementation)
3. Code: Implement complete webhook with error handling
4. Read: [LUA_WEBHOOKS_TESTING.md § Sandbox Testing](./LUA_WEBHOOKS_TESTING.md#sandbox-testing)
5. Deploy to sandbox and test with real external service

**Time:** 2-4 hours

### Advanced: Production Hardening

1. Read: [LUA_WEBHOOKS.md § Security Best Practices](./LUA_WEBHOOKS.md#security-best-practices)
2. Read: [LUA_WEBHOOKS_TESTING.md § Security Hardening](./LUA_WEBHOOKS_TESTING.md#security-hardening)
3. Read: [LUA_WEBHOOKS_TESTING.md § Monitoring & Alerts](./LUA_WEBHOOKS_TESTING.md#monitoring--alerts)
4. Implement production-grade webhook with:
   - Signature verification
   - Rate limiting
   - Comprehensive logging
   - Health checks
   - Monitoring

**Time:** 4-8 hours

### VERA Integration: Intake Webhook

1. Read: [LUA_WEBHOOKS.md § Integration with VERA](./LUA_WEBHOOKS.md#integration-with-vera)
2. Read: [LUA_WEBHOOKS_REFERENCE.md § VERA Dashboard Integration](./LUA_WEBHOOKS_REFERENCE.md#vera-dashboard-integration)
3. Configure environment variables
4. Deploy webhook
5. Test end-to-end from dashboard

**Time:** 1-2 hours

---

## Code Examples by Use Case

### Stripe Payment Processing

**Files:** [LUA_WEBHOOKS.md § Stripe Payments](./LUA_WEBHOOKS.md#stripe-payments)

Webhook handler for:
- Payment succeeded
- Payment failed
- Refund processed

Features:
- User notification
- Order status update
- Error handling

### Shopify E-commerce

**Files:** [LUA_WEBHOOKS.md § Shopify Orders](./LUA_WEBHOOKS.md#shopify-orders)

Webhook handler for:
- New order creation
- Order updates

Features:
- Customer notification
- Order data storage
- Fulfillment tracking

### GitHub Deployments

**Files:** [LUA_WEBHOOKS.md § GitHub Deployments](./LUA_WEBHOOKS.md#github-deployments)

Webhook handler for:
- Deployment status updates
- Release notifications

Features:
- Deployment tracking
- Status monitoring

### VERA Transaction Intake

**Files:** [LUA_WEBHOOKS.md § Integration with VERA](./LUA_WEBHOOKS.md#integration-with-vera)

Webhook handler for:
- Transaction analysis
- STR report generation
- Dashboard integration

Features:
- CSV data processing
- Risk analysis
- Report generation

---

## Common Tasks

### Task: Add Logging to Webhook

See: [LUA_WEBHOOKS_TESTING.md § Enabling Debug Logging](./LUA_WEBHOOKS_TESTING.md#enabling-debug-logging)

```typescript
console.log('Webhook Debug:', logEntry);
await Data.create('webhook-debug-logs', logEntry, `${eventType}-${Date.now()}`);
```

### Task: Verify Webhook Signature

See: [LUA_WEBHOOKS_REFERENCE.md § Signature Verification](./LUA_WEBHOOKS_REFERENCE.md#signature-verification)

```typescript
if (!verifySignature(body, signature, secret)) {
  return { error: 'Invalid signature', status: 401 };
}
```

### Task: Prevent Duplicate Processing

See: [LUA_WEBHOOKS.md § Idempotency](./LUA_WEBHOOKS.md#idempotency)

```typescript
const processed = await Data.get('processed-webhooks', eventId);
if (processed) return { already_processed: true };
```

### Task: Queue Long-Running Work

See: [LUA_WEBHOOKS_TESTING.md § Issue: Timeout](./LUA_WEBHOOKS_TESTING.md#issue-timeout--30-seconds)

```typescript
await Jobs.create({
  name: 'process-data',
  execute: async () => { /* long work */ }
});
return { received: true, queued: true };
```

### Task: Send User Notification

See: [LUA_WEBHOOKS.md § Implementation](./LUA_WEBHOOKS.md#basic-structure)

```typescript
const user = await User.get(userId);
await user.send([{
  type: 'text',
  text: 'Your payment was confirmed!'
}]);
```

### Task: Monitor Webhook Performance

See: [LUA_WEBHOOKS_TESTING.md § Webhook Metrics](./LUA_WEBHOOKS_TESTING.md#webhook-metrics)

```typescript
const latency = Date.now() - startTime;
await Data.create('webhook-metrics', { latency, status: 'success' });
```

---

## Environment Variables

### Setup

```bash
# Sandbox
lua env sandbox set VAR_NAME value

# Production
lua env production set VAR_NAME value
```

### Common Variables

For external service integration:

```
STRIPE_API_KEY                    # Stripe API key
STRIPE_WEBHOOK_SECRET             # Stripe webhook signing secret
SHOPIFY_API_KEY                   # Shopify API key
SHOPIFY_ACCESS_TOKEN              # Shopify access token
GITHUB_TOKEN                      # GitHub personal access token
LUA_TRANSACTION_INTAKE_BEARER_TOKEN  # For VERA integration
```

See: [LUA_WEBHOOKS.md § Environment Variables](./LUA_WEBHOOKS.md#environment-variables) and [LUA_WEBHOOKS_REFERENCE.md § Environment Variables](./LUA_WEBHOOKS_REFERENCE.md#environment-variables)

---

## Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| Webhook not triggering | [LUA_WEBHOOKS_TESTING.md § Issue: Webhook Not Triggering](./LUA_WEBHOOKS_TESTING.md#issue-webhook-not-triggering) |
| 404 response | [LUA_WEBHOOKS_TESTING.md § Issue: 404 Not Found](./LUA_WEBHOOKS_TESTING.md#issue-404-not-found) |
| 401 authorization error | [LUA_WEBHOOKS_TESTING.md § Issue: 401 Unauthorized Response](./LUA_WEBHOOKS_TESTING.md#issue-401-unauthorized-response) |
| Timeout errors | [LUA_WEBHOOKS_TESTING.md § Issue: Timeout (> 30 seconds)](./LUA_WEBHOOKS_TESTING.md#issue-timeout--30-seconds) |
| Duplicate events | [LUA_WEBHOOKS_TESTING.md § Issue: Duplicate Processing](./LUA_WEBHOOKS_TESTING.md#issue-duplicate-processing) |
| Invalid signature | [LUA_WEBHOOKS_TESTING.md § Issue: Invalid Signature](./LUA_WEBHOOKS_TESTING.md#issue-invalid-signature) |
| Out of memory | [LUA_WEBHOOKS_TESTING.md § Issue: Out of Memory](./LUA_WEBHOOKS_TESTING.md#issue-out-of-memory) |
| General debugging | [LUA_WEBHOOKS_TESTING.md § Production Debugging](./LUA_WEBHOOKS_TESTING.md#production-debugging) |

---

## Official Resources

- **Lua Platform:** https://heylua.ai
- **Official Docs:** https://docs.heylua.ai
- **Webhooks Overview:** https://docs.heylua.ai/overview/webhooks
- **LuaWebhook API:** https://docs.heylua.ai/api/luawebhook.md
- **Skill Management:** https://docs.heylua.ai/cli/skill-management.md
- **CLI Reference:** https://docs.heylua.ai/cli/overview.md
- **Discord Community:** https://discord.gg/SRPEuwCzaD

---

## Document Maintenance

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Lua CLI Version:** 3.12.2+

### How to Update

These documentation files should be updated when:
- Lua releases new webhook features
- New integration patterns are discovered
- VERA integration changes
- Security best practices evolve

Maintain the three-document structure:
1. **LUA_WEBHOOKS.md** — Complete reference (authoritative)
2. **LUA_WEBHOOKS_TESTING.md** — Practical testing guide
3. **LUA_WEBHOOKS_REFERENCE.md** — Quick lookup and examples

---

## Related Project Documentation

- [QUICKSTART.md](../QUICKSTART.md) — Agent setup and getting started
- [README.md](../README.md) — Project overview
- [backend/README.md](../../backend/README.md) — Backend setup and configuration
- [vera-frontend README](../../vera-frontend/README.md) — Frontend setup

---

## Questions?

If you have questions about:
- **Webhook implementation** → See [LUA_WEBHOOKS.md](./LUA_WEBHOOKS.md)
- **Testing & debugging** → See [LUA_WEBHOOKS_TESTING.md](./LUA_WEBHOOKS_TESTING.md)
- **Quick lookup** → See [LUA_WEBHOOKS_REFERENCE.md](./LUA_WEBHOOKS_REFERENCE.md)
- **VERA integration** → See sections in both main guide and reference
- **General Lua questions** → Visit [Lua Discord](https://discord.gg/SRPEuwCzaD)

---

**Happy building! 🚀**
