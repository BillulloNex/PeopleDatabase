# PeopleDatabase — Agent Rules

## Deployment: Coolify + Cloudflare + Alpine Stack

This app is deployed on the Lenovo server via Coolify, behind Cloudflare proxy.
Follow these rules for all deployments:

### 1. Cloudflare SSL: Always use `http://` domains in Coolify
Cloudflare SSL mode is "Flexible" — Cloudflare terminates HTTPS at the edge and
connects to the origin (Traefik) over HTTP. If the Coolify domain is set to
`https://`, Coolify adds a `redirect-to-https` Traefik middleware on the HTTP
router, creating an infinite 307 redirect loop:

```
Browser → CF (HTTPS) → Traefik (HTTP) → redirect → CF (HTTPS) → Traefik (HTTP) → redirect → ∞
```

**Rule**: Always set domains as `http://people.beenex.org` in Coolify. Cloudflare
handles HTTPS for browsers. All other working `*.beenex.org` apps follow this pattern.

### 2. Alpine images: Install `curl` or disable Coolify healthchecks
Coolify's built-in healthcheck runs `curl` or `wget` inside the container.
`node:22-alpine` (used in the Dockerfile) has neither. Healthcheck failures
cause Coolify to roll back the deployment even when the app is running fine.

**Rule**: Either:
- Add `RUN apk add --no-cache curl` to the `runner` stage in the Dockerfile, OR
- Disable Coolify healthchecks (currently disabled)

### 3. Force rebuild on first deploy
Coolify may reuse stale Docker BuildKit cache layers from deleted applications.
This can cause phantom "Module not found" webpack errors even when all source
files are present in the repo.

**Rule**: Always use `force: true` when deploying for the first time or after
recreating an application resource in Coolify.

### 4. `NODE_ENV` must be runtime-only in Coolify
The Dockerfile already sets `ENV NODE_ENV=production` in the builder stage.
If Coolify also injects `NODE_ENV=production` as a build-time `ARG`, it can
interfere with `npm ci` (skipping devDependencies needed for the build).

**Rule**: Set `NODE_ENV` as runtime-only (`is_buildtime=false, is_runtime=true`)
in Coolify env vars. The Dockerfile handles build-time `NODE_ENV` itself.

## Infrastructure Reference

| Resource | Identifier | Notes |
|----------|-----------|-------|
| Coolify Project | `jgorvqsxs5x1qjepmpn5jvco` | "PeopleDatabase" |
| App UUID | `f9lvdno31xyw857q4jgq6g4g` | Next.js app on port 3000 |
| Database UUID | `porozj7lezx4afl3ld1nr2zz` | `peopledb-postgres`, Postgres 16-alpine |
| Server | `kw1b1pmbkbwqqrjo3sfh6hbg` | Lenovo (`100.77.63.10`) |
| GitHub App | `y12ur323wm5f2tdta5b78s19` | `coolify-g-h-app-bee-nex` (BillulloNex org) |
| Domain | `people.beenex.org` | Behind Cloudflare (Flexible SSL) |
| DB connection | `porozj7lezx4afl3ld1nr2zz:5432` | Internal Docker DNS on `coolify` network |
