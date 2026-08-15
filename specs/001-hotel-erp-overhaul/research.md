# Research Notes: Hotel ERP Overhaul

**Date**: 2026-08-16 | **Feature**: specs/001-hotel-erp-overhaul

## R1 — Where does the public guest site live?

**Decision**: Same SPA, but fully separated from the staff ERP. Route namespaces: public site at `#/` (home), `#/rooms`, `#/booking`, `#/guest/signup`, `#/guest/login`, `#/guest/my-bookings`, `#/contact`; staff ERP at `#/staff/*`. Separate token storage keys: `arynox_token` (staff), `arynox_guest_token` (guest). Anonymous and guest users only ever render public pages; the staff login and all ERP routes require a valid staff session, and every staff API route rejects guest tokens (kind=staff check in the guard).

**Rationale**: The user explicitly requires the public to see only the booking site, and the site to be a perfect mobile-first website. Keeping the public site as its own route namespace with its own layout (PublicLayout) and its own responsive styling satisfies FR-024/FR-025/SC-009/SC-010.

**Alternatives rejected**: Separate `/public` Next.js route (extra routing complexity with the catch-all `[...path]` API handler); separate deployment (violates P1).

## R2 — Booking state machine and room status derivation

**Decision**: Booking statuses: `pending` (online), `confirmed`, `checked_in`, `checked_out`, `cancelled`. Room status stays in sync: `available` (no active booking), `reserved` (confirmed, not checked in), `occupied` (checked in), `cleaning` (checked out + housekeeping pending).

**Rationale**: QloApps uses color-coded availability (available/partially/booked/unavailable). We derive the grid from the bookings table for a date range, with colors: green available, blue reserved/booked, amber check-in today, red unavailable/OOO.

## R3 — Restaurant KOT flow

**Decision**: `order_items` gains a `kot_status` column (`new`, `preparing`, `served`) plus `kot_time`. Sending to kitchen flips all items to `new`; kitchen display polls `/api/orders?scope=kitchen`; kitchen updates per-item status; waiter marks served. Bill settlement (cash/card/UPI) writes a `bills` row (type RESTAURANT) and frees the table. "Charge to room" writes a `bills` row (type ROOM) linked to the active booking and adds to the booking's total on check-out.

**Rationale**: Matches HotelOnTouch's Service/LiveService dispatch model (assignee, status) adapted to a kitchen context and the existing orders schema.

## R4 — Housekeeping

**Decision**: New `housekeeping_tasks` table (room_id, task, assignee, status, scheduled_at) + `rooms.hk_status` column (clean/dirty/in-progress/ooo). Check-out sets the room to `dirty`; the board lists dirty/in-progress tasks; housekeeping marks clean → room becomes available again.

**Rationale**: This was the biggest gap across all four reference repos; modeled on HotelOnTouch's task-assignment idea.

## R5 — Auth & roles

**Decision**: Real login screen (no auto-login). JWT HS256, 30-day expiry, `remember` flag (longer expiry). `users` table gains `enabled` column. Role permission map in `lib/auth.js` (client) and enforced server-side by route guard in the handler. Roles: admin, manager, reception, kitchen, restaurant, housekeeping. Admin seeds first; Users screen only visible to admin/manager. **Guest accounts are a separate table** (`guest_accounts`) with email login, a separate JWT `kind` field, and their own public endpoints — guest tokens are rejected by every staff route guard.

**Rationale**: P3/P4. hotel-mgmt-system used a binary `isadmin`; HotelOnTouch used type admin/employee — we go richer, and keep guest and staff credentials fully separate so the public can never reach the ERP (FR-024).

## R6 — Reports & export

**Decision**: Extend `/api/reports/summary` with revenue-by-source; add `/api/reports/booking-stats`. CSV export generated client-side from already-fetched data (no dedicated endpoint). Charts via a small dependency-free SVG component.

**Rationale**: BlueBird + qloapps both had chart dashboards and Excel export; CSV client-side avoids new server work.

## R7 — Menu/table seeds

**Decision**: Seed a few tables (T1–T10) and keep the existing menu seed; add `amenities` column to room_types and seed common amenities.

**Rationale**: Immediate usability matches the reference repos' pre-seeded content.