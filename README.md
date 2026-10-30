# Web

React, TypeScript, Vite, and Tailwind dashboard for gym owners and admins. Requires
Node.js 20+ and npm.

```sh
npm install
cp .env.example .env.local
npm run gen:api
npm run dev
```

## Checks

```sh
npm run lint
npm run typecheck
npm run build
```

`npm run gen:api` regenerates `src/api/schema.d.ts` from the committed `schema.yml`
with `openapi-typescript`. Do not hand-write endpoint types; use the generated
schema with the typed wrapper in `src/api/client.ts`.

## Authentication

Login uses phone number and password. The access token is kept in memory only and
the refresh token is stored in `sessionStorage` for this phase. Requests retry once
with a fresh access token after a 401, and the session is loaded from `/api/me/`
after login and on reload.

TODO: move the refresh token to a secure, httpOnly cookie with CSRF protection
before production. `sessionStorage` is readable by JavaScript and is only a
temporary phase-2 choice.

## Pages

- Login and owner gym registration.
- Owner/admin invite creation with a one-time code shown once and copy support.
- Owner invite history.
- Owner team management: admin list, staff permission switches, and deactivate
  confirmation.
- Gym users list with a server-side role filter.
- Member assignment: assign or unassign each member to a trainer.
- Loading, empty, and error states throughout, with permission-aware navigation.
  All authorization is still enforced by the backend API.

Brand colors and fonts are defined in `tailwind.config.js`; `VITE_API_BASE_URL`
points the app at the API (default `http://127.0.0.1:8000/api`).
