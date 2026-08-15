# Implementation Plan: Hotel ERP Overhaul

**Branch**: `001-hotel-erp-overhaul` | **Date**: 2026-08-16 | **Spec**: specs/001-hotel-erp-overhaul/spec.md

## Summary

Rebuild Arynox_Hotel_ERP into a complete 2026 hotel ERP on the existing single Next.js app: full role-based login with user management, a color-coded room availability grid, the full booking lifecycle (pending → confirmed → checked-in → checked-out/cancelled) with meal plans/add-ons, a public guest booking website, a full restaurant ERP (tables, menu, KOT, kitchen display, bill settlement incl. room folio), housekeeping task board, rich reports with CSV export, and a modern dark-mode responsive UI inspired by the four reference repos. All existing modules and the Turso/offline data layer are preserved.

## Technical Context

**Language/Version**: JavaScript (Node 24), JSX, Next.js 14.2.x (App Router, client SPA via dynamic ssr:false)

**Primary Dependencies**: next, react, react-dom, @libsql/client, groq-sdk (all already in `frontend/package.json`)

**Storage**: Turso (libSQL) online via `TURSO_DATABASE_URL`; offline SQLite file at `backend/data/hotel.db` when `DB_LOCAL=true`. Single data layer: `frontend/src/lib/db.js`.

**Testing**: Manual end-to-end via `npm run dev` / `npm run build && next start` + `curl`; live-site verification on Vercel. No unit test framework currently in the repo.

**Target Platform**: Web (Vercel serverless, Node runtime); responsive (desktop + tablet front desk + mobile).

**Project Type**: Single web application (UI + API colocated, Next.js route handler).

**Performance Goals**: Dashboard/login < 5s; booking creation < 1 min; no double-booking ever.

**Constraints**: One Vercel project; role-guarded API; dark mode + responsive; keep all existing endpoints.

**Scale/Scope**: ~10 views, ~8 roles, ~15 new API routes, ~5 new schema tables, public site + admin app in one codebase.

## Constitution Check

*GATE: Must pass. Reviewed against constitution.md v1.0.*

| Principle | Status | Notes |
|---|---|---|
| P1 Single-app architecture | ✅ PASS | Everything stays in `frontend/` Next.js app; public site is a route within it |
| P2 Colocated data layer | ✅ PASS | New tables added to `db.js` schema; all writes via `db` |
| P3 Security first | ✅ PASS | New public booking endpoints scoped to specific paths; everything else JWT-guarded; passwords hashed |
| P4 Role-based access | ✅ PASS | New `users.role` + permission matrix; route + UI guards |
| P5 Feature preservation | ✅ PASS | All existing endpoints/routes retained; changes are additive |
| P6 UI/UX quality bar | ✅ PASS | New dark-mode shell, toasts, charts, room grid |
| P7 Testability | ✅ PASS | Every user story maps to verifiable acceptance scenarios |
| P8 Scope discipline | ✅ PASS | INR, English, recorded payments only |
| P9 Docs tracking | ✅ PASS | spec → plan → tasks workflow followed |

No violations.

## Research Decisions (from research.md)

1. **Public guest site placement**: served at `#/` (home), `#/rooms`, `#/booking`, `#/guest/signup`, `#/guest/login`, `#/guest/my-bookings`, `#/contact`. The staff ERP lives under `#/staff/*` routes and requires a staff session. Separate token keys: `arynox_token` (staff) and `arynox_guest_token` (guest). Anonymous and guest visitors only ever see public pages — the ERP is unreachable without a valid staff session. Rationale: one deployment, one codebase, but airtight separation per FR-024/SC-009.
2. **Booking state machine**: `pending → confirmed → checked-in → checked-out`; `cancelled` from pending/confirmed. Room status derived: available / reserved / occupied / cleaning.
3. **Restaurant flow**: `tables` + `orders` + `order_items` with per-item KOT status (`new → preparing → served`). Kitchen display = filtered view. Bill settlement writes to `bills` (type RESTAURANT) or adds to room booking folio (`bills` type ROOM with extra charges).
4. **Housekeeping**: `housekeeping_tasks` table + `rooms.hk_status` column (clean/dirty/in-progress/ooo).
5. **Auth**: real login screen; JWT with 30-day expiry, `remember` flag; per-role module map; `users.enabled` column; password change endpoints. **Guest auth separate**: `guest_accounts` table, login via email, separate JWT payload with `kind: 'guest'` vs `kind: 'staff'`, and staff route guards reject guest tokens.
6. **UI**: extend `globals.css` with dark theme via `[data-theme=dark]`; a small toast + chart utility; keep hash routing. **Public site is mobile-first** with a dedicated responsive layout (hamburger nav, hero, room cards, facilities, gallery, contact, footer).
7. **CSV export**: client-side CSV generation from fetched report data (no new endpoint needed for simple cases).

## Project Structure

### Documentation (this feature)

```text
specs/001-hotel-erp-overhaul/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/            # API contracts (new endpoints) + role matrix
└── checklists/requirements.md
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── app/
│   │   ├── api/[...path]/route.js      # extend with new endpoints
│   │   ├── page.jsx                    # client entry
│   │   └── globals.css                 # dark mode + new components
│   ├── lib/
│   │   ├── db.js                       # new tables + seed (roles, tables, amenities)
│   │   ├── auth.js                     # role helper, permission map
│   │   ├── receipt.js                  # unchanged
│   │   └── ai.js                       # unchanged
│   ├── components/
│   │   ├── Layout.jsx                  # role-filtered nav, dark toggle, toasts, logout
│   │   ├── ReceiptModal.jsx            # unchanged
│   │   ├── Toast.jsx                   # NEW toast system
│   │   ├── Chart.jsx                   # NEW lightweight SVG chart
│   │   ├── RoomGrid.jsx                # NEW availability calendar grid
│   │   ├── PublicLayout.jsx            # NEW public site header/footer/nav (mobile-first)
│   │   └── RoomCard.jsx                # NEW room showcase card for public site
│   └── views/
│       ├── Login.jsx                   # NEW staff login screen (username + password)
│       ├── PublicHome.jsx              # NEW guest homepage (hero, facilities, gallery, contact)
│       ├── PublicRooms.jsx             # NEW room showcase + availability search
│       ├── PublicBooking.jsx           # NEW availability results + booking form
│       ├── PublicConfirm.jsx           # NEW confirmation page
│       ├── GuestSignup.jsx             # NEW guest account signup
│       ├── GuestLogin.jsx              # NEW guest login (email)
│       ├── GuestMyBookings.jsx         # NEW guest bookings portal + cancel pending
│       ├── Dashboard.jsx               # rework with charts + role KPIs
│       ├── Rooms.jsx                   # + availability grid entry
│       ├── Availability.jsx            # NEW color-coded grid
│       ├── Bookings.jsx                # booking lifecycle, meal plans, add-ons, folio
│       ├── Guests.jsx                  # guest registry + folio balance
│       ├── Restaurant.jsx              # tables, menu, KOT send
│       ├── Kitchen.jsx                 # NEW kitchen display
│       ├── Housekeeping.jsx            # NEW task board
│       ├── POS.jsx                     # unchanged behavior
│       ├── Reports.jsx                 # + CSV export, source split, charts
│       ├── Assistant.jsx               # unchanged
│       ├── Settings.jsx                # unchanged
│       └── Users.jsx                   # NEW staff/user management (admin)
```

**Structure Decision**: Extend the existing single `frontend/` Next.js app. New views/components are added alongside existing ones; the route handler is extended. No new projects, no monorepo.

## API Contract Summary (see contracts/ for full detail)

| Method | Path | Public | Roles | Purpose |
|---|---|---|---|---|
| POST | /api/auth/login | ✅ | — | Staff login, returns JWT + user (kind=staff) |
| POST | /api/auth/logout | ❌ | staff | Invalidate session (client-side token removal + audit) |
| PUT | /api/auth/password | ❌ | staff | Change own password |
| GET | /api/users | ❌ | admin,manager | List staff |
| POST | /api/users | ❌ | admin | Create staff |
| PUT | /api/users/:id | ❌ | admin | Edit staff (role, enabled) |
| POST | /api/users/:id/password | ❌ | admin | Admin reset password |
| POST | /api/guest/signup | ✅ | public | Create guest account (name/email/phone/password) |
| POST | /api/guest/login | ✅ | public | Guest login via email → guest JWT |
| GET | /api/guest/my-bookings | ❌ | guest | List guest's bookings |
| POST | /api/guest/bookings/:id/cancel | ❌ | guest | Cancel own pending booking |
| GET | /api/availability?from=&to= | ❌ | staff | Room/day status grid |
| POST | /api/bookings | ❌ | staff | Staff booking (confirm immediately or pending) |
| PUT | /api/bookings/:id | ❌ | staff | Edit booking (dates, extras, meal plan) |
| POST | /api/bookings/:id/confirm | ❌ | staff | Confirm pending booking |
| GET | /api/menu-categories | ✅ | public | Menu categories |
| POST | /api/tables | ❌ | restaurant,admin | Add table |
| GET | /api/tables | ❌ | restaurant,admin | List tables |
| PUT | /api/tables/:id | ❌ | restaurant,admin | Edit table |
| POST | /api/orders/:id/kot | ❌ | restaurant,admin | Send items to kitchen (new→preparing) |
| PUT | /api/order-items/:id/status | ❌ | kitchen,restaurant | Update KOT status |
| POST | /api/orders/:id/folio | ❌ | restaurant,admin | Charge bill to room folio |
| GET | /api/housekeeping | ❌ | staff | Housekeeping board data |
| PUT | /api/rooms/:id/hk | ❌ | housekeeping,admin | Set housekeeping status |
| POST | /api/rooms/:id/hk-task | ❌ | housekeeping,admin | Create task |
| PUT | /api/housekeeping/:taskId | ❌ | housekeeping,admin | Update task status |
| GET | /api/public/hotels | ✅ | public | Brand/settings + room types for guest site |
| POST | /api/public/bookings | ✅ | public | Guest booking (creates pending booking; links guest_account if logged in) |
| GET | /api/reports/summary | ❌ | staff | Extend with source split |

## Implementation Order (task phases)

1. **DB & schema**: new tables (guest_accounts, users.enabled, tables, order KOT status, housekeeping, amenities) + seed.
2. **Auth**: staff login/logout/password, user CRUD, role permission map, route guards; guest signup/login with separate tokens.
3. **Booking core**: availability grid API, booking lifecycle, meal plans/add-ons, folio extras, double-booking check.
4. **Public guest site (mobile-first)**: homepage, room showcase, availability search, booking form, confirmation, guest signup/login, My Bookings — all responsive.
5. **Restaurant ERP**: tables, KOT, kitchen display, bill settlement, folio charge.
6. **Housekeeping**: task board + room hk status.
7. **Reports & UI polish**: charts, CSV export, dark mode, toasts, responsive.
8. **Verify + deploy**: local e2e per quickstart, then Vercel deploy + live checks.