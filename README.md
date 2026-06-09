# Sports Betting Back Office

Next.js operator portal for the [sports-betting-service](https://github.com/clarinal12/sports-betting-service) Phase 6 back-office APIs.

GitHub: [clarinal12/sports-betting-backoffice](https://github.com/clarinal12/sports-betting-backoffice)

Runs on **port 3002** (player shell uses 3000; API uses 3001).

## Setup

```bash
cp .env.example .env.local
pnpm install   # or npm install
```

Ensure the API allows browser CORS from this origin in development:

```bash
# sports-betting-service/.env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3002,http://127.0.0.1:3002
```

Tenant picker loads from `GET /backoffice/tenants` (scoped by role and SUPER_ADMIN grants).

Seed: `platform@example.com` is granted **Acme only**; `super@example.com` sees all tenants and can edit grants under **Access** in the UI.

## Run

```bash
# Terminal 1 — API
cd ../sports-betting-service && npm run start:dev

# Terminal 2 — back office
pnpm dev
```

Open [http://localhost:3002](http://localhost:3002).

## Seed staff logins

After `npx prisma db seed` in the API repo:

| Account | Password | Role | Scope |
|---------|----------|------|-------|
| `super@example.com` | `Super123!` | `SUPER_ADMIN` | Platform super-user + staff IAM |
| `platform@example.com` | `Platform123!` | `PLATFORM_ADMIN` | Cross-tenant ops + merchant onboarding |
| `admin@acme.example.com` | `Acme123!` | `OPERATOR_ADMIN` | Acme tenant admin only |

## Navigation (Phase 6.9)

Matches `DESIGN.md` §4.9.10:

- **Home** — KPIs (analytics + exposure)
- **Trading** — Exposure, limits, suspend/resume
- **Product** — League offering toggles
- **Bets** — Monitor, detail, void
- **Settlement** — Unsettled events with open bets
- **Analytics** — GGR and status breakdown
- **Compliance** — Audit log search
- **Settings** — Tenant profile, merchant create (platform)
