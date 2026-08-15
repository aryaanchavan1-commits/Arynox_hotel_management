# Project Constitution: Arynox_Hotel_ERP

**Version**: 1.0 | **Status**: Active

## Core Principles

1. **Single-application architecture** — The UI and API live in one Next.js app (`frontend/`) and deploy as one Vercel project (`arynox-hotel-erp`). No separate backend deployment; no proxy/networking between frontend and API.
2. **Colocated data layer** — All persistence goes through `frontend/src/lib/db.js` (Turso online / offline SQLite via `DB_LOCAL=true`). No other data access path is allowed.
3. **Security first** — All API routes except `/api/health`, `/api/auth/login`, and the public guest booking endpoints require a valid JWT. Passwords are hashed (never plaintext). Secrets live only in `.env` (gitignored) or Vercel env vars — never in code.
4. **Role-based access** — Every authenticated user has a role; sidebar menus and API routes are guarded by the role permission matrix. Default `admin` boots the system; admin manages all users.
5. **Existing feature preservation** — Rooms, guests, bookings, menu, orders, POS, bills, receipts (HTML + ESC/POS + thermal), reports, AI assistant, and settings must keep working. New features extend, never remove.
6. **UI/UX quality bar** — Modern 2026 styling inspired by the reference repos (QloApps, hotel-mgmt-system, Hotel-Management-System, HotelOnTouch): dark mode, responsive layout, color-coded statuses, charts, toasts. No legacy iframe/dated patterns.
7. **Testability** — Every user story in a spec must be independently verifiable on the live site and/or locally via `next start`. No feature ships without a demonstrable acceptance scenario.
8. **Scope discipline** — Multi-currency, multi-language, and real payment gateways are explicitly out of scope unless a spec says otherwise. INR (₹), English, and recorded-payment methods only.
9. **Docs tracking** — Every feature follows Spec-Driven Development: `spec.md` → `plan.md` → `tasks.md` under `specs/<NNN>-<name>/` before implementation.

## Enforcement

- Plans that violate Principles 1–5 are rejected unless a justified Complexity Tracking entry is added.
- New endpoints must follow the catch-all `src/app/api/[...path]/route.js` pattern.
- User stories must map 1:1 to tasks with verification steps.