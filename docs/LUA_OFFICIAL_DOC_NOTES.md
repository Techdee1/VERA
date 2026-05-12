# Lua Official Documentation Notes

Captured: 2026-04-24
Source (documentation index): https://docs.heylua.ai/llms.txt

This file stores the Lua documentation excerpt shared by the team for local reference during GRACE agent implementation.

## Quick Start (5-minute flow)

1. Install CLI

```bash
npm install -g lua-cli
```

2. Authenticate

```bash
lua auth configure
```

Email flow:
- Enter email
- Confirm 6-digit code
- API key is generated and saved

3. Initialize project

```bash
mkdir my-first-skill && cd my-first-skill
lua init
```

4. Test locally

```bash
lua test
```

## What `lua init` provides

- Multiple skill examples
- 30+ tool examples
- Lua platform API integrations
- TypeScript config
- Ready-to-customize template

## CLI Overview (v3)

Main entry:

```bash
lua [options] [command]
```

Global flags:
- `-V, --version`
- `-h, --help`

Notable additions from shared docs:
- v3.6.0: telemetry collection (`lua telemetry off` or `LUA_TELEMETRY=false`)
- v3.3.0: non-interactive mode support for automation/AI IDEs
- v3.1.0: marketplace support (`lua marketplace`)
- v3.0.0: unified primitives (`LuaAgent`, `LuaWebhook`, `LuaJob`, preprocessors, postprocessors)

## Core command groups from shared docs

Authentication:
- `lua auth`

Setup and development:
- `lua init`
- `lua env`
- `lua persona`
- `lua features`
- `lua resources`
- `lua skills`
- `lua compile`
- `lua sync`
- `lua test`
- `lua chat`

Deployment:
- `lua push`
- `lua deploy`
- `lua production`

Integrations:
- `lua mcp`
- `lua integrations`
- `lua channels`

Debugging and utility:
- `lua logs`
- `lua agents`
- `lua update`
- `lua completion`
- `lua admin`
- `lua evals`
- `lua docs`
- `lua telemetry`

## Direct mode examples

```bash
lua push skill
lua push persona
lua env sandbox
lua env production
lua persona sandbox
lua persona production
lua skills sandbox
lua skills production
```

## Typical workflows captured

New project:
1. `lua auth configure`
2. `lua init`
3. `lua env sandbox`
4. `lua persona sandbox`
5. `lua chat` (or `lua test` for tool-level checks)
6. `lua push` + `lua deploy`

Development loop:
1. Update env/persona as needed
2. Edit tools in `src/tools/*.ts`
3. Validate with `lua chat` and `lua test`
4. Push/deploy (`lua push skill`, then `lua deploy`)

Quick fix:

```bash
lua test
lua chat
lua push skill && lua deploy
```

## v3 Agent structure guidance from shared docs

Pattern in `src/index.ts`:
- export `agent` using `new LuaAgent({...})`
- define `persona`
- register `skills`
- optional `webhooks`, `jobs`, `mcpServers`

Recommended folders:
- `src/skills`
- `src/tools`
- `src/webhooks`
- `src/jobs`
- `src/mcp`
- `src/preprocessors`
- `src/postprocessors`

Manifest notes (`lua.skill.yaml`):
- Mostly auto-managed IDs and versions
- Manual updates should be minimal and controlled

## Common errors and fixes from shared docs

- No API key found -> run `lua auth configure`
- No `lua.skill.yaml` found -> run command in skill dir / initialize first
- Version already exists -> bump version in `lua.skill.yaml`
- Compilation failed (`index.ts` missing) -> add `index.ts` or `src/index.ts`

## Operational notes for GRACE agent work

- Prefer non-interactive CLI usage where possible for deterministic automation.
- Keep telemetry explicitly configured per environment policy.
- Validate tools with local tests in addition to `lua test` prompts.
- Keep deployment as explicit two-step: push then deploy.
