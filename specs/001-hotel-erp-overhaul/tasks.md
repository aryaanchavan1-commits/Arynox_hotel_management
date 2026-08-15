# Tasks: Hotel ERP Overhaul

**Branch**: `001-hotel-erp-overhaul` | **Date**: 2026-08-16 | **Spec**: specs/001-hotel-erp-overhaul/spec.md | **Plan**: specs/001-hotel-erp-overhaul/plan.md

**Stack**: Next.js 14 (JSX), @libsql/client (Turso/offline), groq-sdk. Single app in `frontend/`.

---

## Phase 1 — Setup (foundational)

- [x] T001 Read current `frontend/src/lib/db.js` schema, `frontend/src/app/api/[...path]/route.js`, `frontend/src/App.jsx`, `frontend/src/components/Layout.jsx`, `frontend/src/api.js`; confirm extension points match plan
- [x] T002 Create `specs/001-hotel-erp-overhaul/contracts/api.md` if missing (already drafted) and verify task list aligns 1:1 with it

## Phase 2 — Data layer & schema (foundational)

- [x] T003 Extend `frontend/src/lib/db.js` SCHEMA: add `guest_accounts` table, `users.enabled` column migration, `tables`, `housekeeping_tasks` tables; add `kot_status`/`kot_time` to `order_items`; add `meal_plan`, `extras_json`, `source`, `reference`, `guest_account_id` to `bookings`; add `amenities`, `image` to `room_types`; add `hk_status` to `rooms`
- [x] T004 Extend `frontend/src/lib/db.js` seed(): seed tables T1–T10, room_type amenities/images, welcome_message + currency_symbol settings
- [x] T005 Add migration helper in `frontend/src/lib/db.js` to ALTER existing tables (SQLite/turso ALTER ADD COLUMN with try/catch) so old DBs upgrade in place
- [x] T006 Verify schema loads: `npm run build` in `frontend/` passes and a fresh `backend/data/hotel.db` seeds without error

## Phase 3 — [US1] Login system with roles + guest accounts (P1)

- [x] T007 Create `frontend/src/views/Login.jsx`: staff username/password form, error display, loading, "stay signed in" checkbox
- [x] T008 Update `frontend/src/App.jsx`: remove auto-login; route namespaces — public site `#/`..`#/guest/*` and staff ERP `#/staff/*`; render public pages when no staff session; render staff login at `#/staff/login`; keep hash routing; wire logout
- [x] T009 Extend `frontend/src/lib/auth.js`: role permission map `ROLE_MODULES`, `allowed(role, module)`, `userFromToken`, token helpers distinguishing staff vs guest (`kind`)
- [x] T010 Extend `frontend/src/app/api/[...path]/route.js`: enforce `users.enabled`, add role guard helper `guard(path, user)` returning 403, require `kind==='staff'` on all staff routes; reject guest tokens
- [x] T011 Add `POST /api/auth/logout`, `PUT /api/auth/password` endpoints in route.js
- [x] T012 [P] Add `GET/POST /api/users`, `PUT /api/users/:id`, `POST /api/users/:id/password` endpoints in route.js (admin only)
- [x] T012b [P] Add `POST /api/guest/signup`, `POST /api/guest/login`, `GET /api/guest/my-bookings`, `POST /api/guest/bookings/:id/cancel` endpoints in route.js (public signup/login; guest-token for the rest)
- [x] T013 Create `frontend/src/views/Users.jsx`: staff list, add/edit/disable, reset password (admin only)
- [x] T014 Update `frontend/src/components/Layout.jsx`: role-filtered nav from `ROLE_MODULES`, dark-mode toggle, logout button, user chip; only rendered inside staff ERP
- [x] T015 Add `api.js` helpers: `logout()`, `changePassword()`, `listUsers()`, `createUser()`, `updateUser()`, `resetPassword()`, `guestSignup()`, `guestLogin()`, `guestBookings()`, `guestCancelBooking()`

## Phase 4 — [US2] Room booking ERP + availability (P1)

- [x] T016 Add `GET /api/availability?from=&to=` in route.js: build rooms × days matrix from bookings + room status
- [x] T017 Add double-booking check SQL helper in route.js (overlap query) used by bookings POST/PUT
- [x] T018 Extend `POST /api/bookings`: accept meal_plan, extras, source; generate reference; 409 on overlap
- [x] T019 Add `PUT /api/bookings/:id` and `POST /api/bookings/:id/confirm` in route.js
- [x] T020 Extend checkout in route.js: include extras + folio charges in bill; set room → cleaning
- [x] T021 Create `frontend/src/components/RoomGrid.jsx`: color-coded room × day grid (green/blue/amber/red), clickable cells
- [x] T022 Create `frontend/src/views/Availability.jsx`: date range picker + RoomGrid; tap cell → new booking prefill
- [x] T023 Rework `frontend/src/views/Bookings.jsx`: lifecycle buttons (confirm/checkin/checkout/cancel), meal plan + extras editor, reference/source badges, folio balance
- [x] T024 Add booking extras + meal plan UI in Bookings (add/remove add-on lines with price)
- [x] T025 Update `frontend/src/views/Rooms.jsx`: link to Availability, show hk status, add/remove rooms with floor & type

## Phase 5 — [US3] Public guest booking website (mobile-first, ERP hidden) (P1)

- [x] T026 Add `GET /api/public/hotels` and `POST /api/public/bookings` endpoints in route.js (public, no auth; links guest_account if guest token present)
- [x] T026b Create `frontend/src/components/PublicLayout.jsx`: mobile-first public header (hamburger nav), footer, brand; responsive
- [x] T027 Create `frontend/src/views/PublicHome.jsx`: hero banner, welcome message from settings, facilities section, gallery, contact/location, footer CTA
- [x] T027b Create `frontend/src/views/PublicRooms.jsx` + `frontend/src/components/RoomCard.jsx`: room showcase with amenities, price, capacity, image, availability search form (dates + guests)
- [x] T028 Create `frontend/src/views/PublicBooking.jsx`: availability results (free rooms + totals), guest info form, validation
- [x] T029 Create `frontend/src/views/PublicConfirm.jsx`: confirmation page with reference number, room, dates, total
- [x] T029b Create `frontend/src/views/GuestSignup.jsx`: name/email/phone/password signup form (mobile-first)
- [x] T029c Create `frontend/src/views/GuestLogin.jsx`: email/password guest login (mobile-first)
- [x] T029d Create `frontend/src/views/GuestMyBookings.jsx`: list own bookings + cancel pending (mobile-first)
- [x] T030 Wire public site into App.jsx routing (guest-mode routes under `#/`, `#/rooms`, `#/booking`, `#/guest/*`); ensure anonymous users can never reach `#/staff/*`; style with globals.css public section

## Phase 6 — [US4] Restaurant ERP + KOT + kitchen display (P1)

- [x] T031 Add `GET/POST /api/tables`, `PUT /api/tables/:id` endpoints in route.js (restaurant/admin/manager)
- [x] T032 Add `POST /api/orders/:id/kot`, `PUT /api/order-items/:id/status`, `POST /api/orders/:id/folio` endpoints in route.js
- [x] T033 Extend orders GET with `kot_status`/`kot_time`; add `?scope=kitchen` filter
- [x] T034 Create `frontend/src/views/Kitchen.jsx`: live order tickets (table, time, items, status), action buttons preparing/served; auto-refresh
- [x] T035 Rework `frontend/src/views/Restaurant.jsx`: table grid (free/occupied), table detail with menu add, Send to Kitchen, KOT list, bill settle (cash/card/UPI) + Charge to Room
- [x] T036 Add table management UI (add/edit tables, seats) in Restaurant

## Phase 7 — [US5] Housekeeping (P2)

- [x] T037 Add `GET /api/housekeeping`, `PUT /api/rooms/:id/hk`, `POST /api/rooms/:id/hk-task`, `PUT /api/housekeeping/:id` endpoints in route.js
- [x] T038 Create `frontend/src/views/Housekeeping.jsx`: room status board (clean/dirty/in-progress/ooo), task list, create/assign tasks, status updates

## Phase 8 — [US5] Reports & analytics (P2)

- [x] T039 Extend `GET /api/reports/summary` in route.js: revenueBySource, pendingBookings, hkDirty
- [x] T040 Add CSV export util in `frontend/src/lib/csv.js` (client-side download)
- [x] T041 Create `frontend/src/components/Chart.jsx`: dependency-free SVG bar/line/donut
- [x] T042 Rework `frontend/src/views/Reports.jsx`: occupancy, revenue trend (daily), revenue by source, pending bookings, housekeeping; CSV export buttons
- [x] T043 Rework `frontend/src/views/Dashboard.jsx`: KPI cards + charts + role-aware quick actions

## Phase 9 — [US6] UI/UX polish + mobile-first (P2)

- [x] T044 Create `frontend/src/components/Toast.jsx` + hook; wire into App for success/error feedback
- [x] T045 Add dark theme to `frontend/src/app/globals.css` via `[data-theme=dark]`; theme toggle persists in localStorage
- [x] T046 Responsive pass on Layout, RoomGrid, Restaurant, Reports for tablet; **full mobile-first pass on all public pages** (PublicLayout, PublicHome, PublicRooms, PublicBooking, PublicConfirm, GuestSignup, GuestLogin, GuestMyBookings) — hamburger nav, stacked cards, touch targets ≥44px, no horizontal scroll at 375px
- [x] T047 Add toast calls on all create/update/checkout actions across views

## Phase 10 — Verification & deploy

- [x] T048 Run full local e2e per `specs/001-hotel-erp-overhaul/quickstart.md` (Scenarios 1–7) on `next start`
- [x] T049 Run existing endpoint regression: health, login, settings, summary, bills, receipts html/escpos, AI chat
- [x] T050 Verify separation: anonymous/guest visitor cannot reach any `#/staff/*` route or staff API (403); guest token rejected by staff routes
- [x] T051 Verify mobile: public pages render without horizontal scroll at 375px viewport; booking flow completes on mobile
- [x] T052 Build & deploy to Vercel (`vercel deploy --prod --force`), verify live: guest site, signup/login, public booking, staff login, summary, restaurant KOT, housekeeping
- [x] T053 Update README, deploy.ps1, run.bat; commit + push

---

## Dependency graph

- Phase 2 (T003–T006) blocks all later phases
- Phase 3 (T007–T015) blocks Phases 4–9 (roles/session needed)
- Phase 4 (T016–T025) blocks Phase 5 (public bookings reuse booking core)
- Phase 5 (T026–T030) depends on Phase 3 (guest auth) + Phase 4 (booking core)
- Phase 6 (T031–T036) independent of 4/5 once auth exists → parallel opportunity
- Phase 7 (T037–T038) and Phase 8 (T039–T043) depend only on Phase 3
- Phase 9 (T044–T047) mostly parallel after Phase 3

**Parallel opportunities**: T012, T012b, T016–T025 (after T010), T031–T038, T044–T047.

**Task counts**: 57 tasks | **MVP scope**: Phases 1–5 (login + guest site + booking + signup) deliver the highest-value standalone slice.