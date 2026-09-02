# PRODUCTION.md — Deploying AURELIUS

This is a **full-stack Node app** (Next.js App Router, server actions, API
routes) whose persistence is JSON files written at runtime. Choose a host
accordingly.

## Platform decision

| Platform | Verdict | Why |
| --- | --- | --- |
| **Railway** | ✅ recommended | Real Node server, writable FS, `pnpm` native |
| **Render** | ✅ good | Node runtime + start command; disk ephemeral (redeploy wipes data) |
| **Fly.io** | ✅ good | Needs Dockerfile + credit card; volumes for persistence |
| **VPS** (Hetzner/DO) | ✅ full control | pm2/systemd + Caddy; attach real disk |
| **Vercel** | ⚠️ not compatible as-is | Serverless FS is ephemeral → sessions/orders break |

## Constraints to know before going public

1. **Single process.** The JSON store's mutex is in-process. Run **one
   instance** (scale = 1). Multi-instance needs PostgreSQL — see
   `docs/DATABASE-MIGRATION.md`.
2. **Data resets on redeploy.** Registers live in `data/local/` inside the
   container. Attach a persistent volume mounted at the project root (Railway
   volume / Render disk / Fly volume) to survive deploys.
3. **Seed once.** The start command runs `pnpm data:if-empty` — it seeds only
   an empty register. `pnpm data` force-resets.
4. **Rotate the demo password.** Set `AURELIUS_SEED_PASSWORD` to something
   private, or delete seeded accounts after first login.

## Railway (fastest path)

1. Push the repo to GitHub (see step below).
2. railway.com → **New Project → Deploy from GitHub repo**.
3. Settings → Build: `pnpm install && pnpm build` · Start:
   `pnpm data:if-empty && pnpm start`.
4. Variables: `NODE_ENV=production`, `AURELIUS_SEED_PASSWORD=<private>`.
5. Generate a domain → HTTPS is automatic (`Secure` cookies activate).

## Render

1. New → **Web Service** from the GitHub repo.
2. Build: `pnpm install && pnpm build` · Start: `pnpm data:if-empty && pnpm start`.
3. Environment: `NODE_ENV=production`, `AURELIUS_SEED_PASSWORD=<private>`.

## Fly.io

```bash
fly launch --no-deploy          # generates fly.toml (internal_port = 3000)
fly volumes create aurelius_data --size 1 --region fra
# fly.toml → [mounts] source="aurelius_data" destination="/data"
# start command: sh -c "ln -s /data/local data/local 2>/dev/null; pnpm data:if-empty && pnpm start"
fly secrets set AURELIUS_SEED_PASSWORD=<private>
fly deploy
```

## VPS (pm2 + Caddy)

```bash
git clone <repo> && cd aurelius && corepack enable && pnpm install && pnpm build
AURELIUS_SEED_PASSWORD=<private> pnpm data:if-empty
pm2 start "pnpm start" --name aurelius
# Caddy: reverse_proxy localhost:3000 (auto-HTTPS)
```

## Pre-flight checklist

- [ ] `pnpm build` exits 0 locally
- [ ] `AURELIUS_SEED_PASSWORD` set to a private value
- [ ] One instance only (or migrate to Postgres first)
- [ ] Persistent volume attached if registrations must survive deploys
- [ ] `data/local/` and `.env` are **not** committed (gitignored)
- [ ] Photography license note acknowledged (`storage/local/photos/CREDITS.md`)

## Post-deploy smoke

```bash
curl -sI https://<host>/ | head -3          # 200
# register → login → add to cart → checkout with 4242… → order appears
```
