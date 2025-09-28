# Initial Setup Log

## Checklist
- [x] Scaffolded Remix app under `dashboard/` using `Shopify/shopify-app-template-remix` (TypeScript flavor).
- [x] Installed npm dependencies (`npm install`).
- [ ] Run `shopify app config link` to bind to Dashboard app (blocked: CLI needs interactive org/app selection).
- [ ] Populate `.env` / `.env.production` with store- and environment-specific secrets.
- [ ] Run `shopify app dev` sanity against dev store once env values are in place.

## Notes
- CLI automation hit an interactive organization prompt; template pulled via `npx degit Shopify/shopify-app-template-remix#main dashboard` instead. Login + linking must be performed locally before first `shopify app dev`.
- Template ships with Prisma setup, Vite config, and `shopify.web.toml`; review and merge with our existing `shopify.app.toml` before deployment.
- Keep this log updated as we wire Shopify auth, DB migrations, and deployment scripts.

## Next Actions
1. Authenticate `shopify` CLI locally (`shopify login --store=afafsaf.myshopify.com`) and run `shopify app config link`.
2. Copy `.env.example` → `.env` / `.env.production` inside `dashboard/`; fill secrets from Partner dashboard + our service credentials.
3. Run `npm run dev -- --shop=afafsaf.myshopify.com` via `shopify app dev` to confirm scaffold imports Polaris shell correctly.
