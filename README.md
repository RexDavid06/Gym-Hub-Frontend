# Gym Hub Web

React, TypeScript, Vite, and Tailwind dashboard for gym owners, admins, and (from Phase 6) platform staff. Requires Node.js 22+ and npm.

```sh
npm install
cp .env.example .env.local
npm run dev
```

## Checks

```sh
npm run lint
npm run typecheck
npm run test:run
npm run build
```

API types and the typed fetch wrapper come from the shared `@gym-hub/api-client` package, hosted in the backend repository's `api-client/` directory. Do not hand-write endpoint types. `src/api/client.ts` is a thin adapter that supplies `VITE_API_BASE_URL` and the auth refresh handler. Build the package before typechecking, testing, or building the app; CI stages and builds it automatically.

## Authentication

Login uses phone number and password. The access token is kept in memory only and the refresh token is stored in `sessionStorage` for now. Requests retry once with a fresh access token after a 401, and the session is loaded from `/api/me/` after login and on reload. Refresh tokens rotate on every refresh, so the rotated token replaces the stored one. Signing out calls `POST /api/auth/logout/` to revoke the refresh token before clearing local state.

TODO: move the refresh token to a secure, httpOnly cookie with CSRF protection before production. `sessionStorage` is readable by JavaScript and is only a temporary choice.

## Implemented pages

- Login and owner gym registration.
- Owner/admin invite creation with a one-time code shown once and copy support.
- Owner invite history.
- Owner team management: admin list, staff permission switches, and deactivate confirmation.
- Gym users list with a server-side role filter.
- Branch management: owners create, edit, and delete branches with per-gym unique names.
- Branch assignment: owners and permitted admins assign staff and members to a branch from the users list.
- Member assignment: assign or unassign each member to a trainer.
- Membership plans: create, edit, deactivate, and reactivate.
- Member membership: assign or renew a plan.
- Payments: record payments, print receipts, and void payments with a reason.
- Dashboard alerts for memberships expiring within 7 days and expired memberships.
- Payment-only admins can open member detail, record payments, print receipts, and void payments without gaining member-list or trainer-assignment controls.
- Platform administration for `super_admin`: `/platform` summary, searchable/filterable `/platform/gyms`, and `/platform/gyms/:id` with suspend/reactivate dialogs.
- Owner notification settings at `/settings/notifications`: separate SMS/WhatsApp reminder and receipt toggles, provider availability, and disabled-channel protection.
- Owner/admin notification history at `/notifications`: event, status, channel, and schedule filters, pagination, delivery details, and owner-only retry for failed messages.
- Member WhatsApp opt-in control on member detail for owners and admins with `manage_members`.
- Loading, empty, and error states throughout, with permission-aware navigation. All authorization is still enforced by the backend API.

## Tests

Vitest and React Testing Library cover permission predicates, platform route guards, branch management/assignment, notification settings/history/retry, the member WhatsApp opt-in, and the payment-only member-detail access path. Run them with `npm run test:run` (or `npm test` for watch mode). The web CI workflow runs lint, typecheck, tests, and build.

## Current limitations

- Notifications are delivered outside the app by SMS or WhatsApp. There is no in-app notification inbox.

Brand colors and fonts are defined in `tailwind.config.js`; `VITE_API_BASE_URL` points at the API origin with no path suffix (default `http://127.0.0.1:8000`). The client appends the `/api/...` path itself, so a value ending in `/api` would produce `/api/api/...` requests.
