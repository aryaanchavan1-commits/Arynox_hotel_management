# Data Model: Hotel ERP Overhaul

**Date**: 2026-08-16 | **Feature**: specs/001-hotel-erp-overhaul

All tables live in the existing schema in `frontend/src/lib/db.js` (Turso / offline SQLite). New/modified tables below.

## Users (modified)

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| username | TEXT UNIQUE | |
| password_hash | TEXT | scrypt, existing SALT |
| name | TEXT | |
| role | TEXT | admin / manager / reception / kitchen / restaurant / housekeeping |
| enabled | INTEGER DEFAULT 1 | 0 = cannot log in |

## Guest Accounts (NEW — separate from staff Users)

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT NOT NULL | |
| email | TEXT UNIQUE NOT NULL | login identifier for guests |
| phone | TEXT | |
| password_hash | TEXT | scrypt, same SALT mechanism |
| created_at | TEXT | |

Relationships: a booking made by a logged-in guest stores `guest_account_id` (nullable). Guest signup creates a `guest_accounts` row; the booking's `guest_id` points to a `guests` row that mirrors the account identity for billing.

## Room Types (modified)

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT | |
| price | REAL | nightly, INR |
| capacity | INTEGER | |
| description | TEXT | |
| amenities | TEXT DEFAULT '' | comma-separated amenity names |
| image | TEXT DEFAULT '' | URL or path to showcase image |

## Rooms (modified)

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| number | TEXT UNIQUE | |
| room_type_id | FK | |
| floor | INTEGER | |
| status | TEXT | available / reserved / occupied / cleaning |
| hk_status | TEXT DEFAULT 'clean' | clean / dirty / in-progress / ooo |

## Bookings (modified)

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| guest_id | FK guests | |
| room_id | FK rooms | |
| check_in / check_out | TEXT (YYYY-MM-DD) | |
| adults / children | INTEGER | |
| meal_plan | TEXT DEFAULT 'room_only' | room_only / breakfast / half_board / full_board |
| extras_json | TEXT DEFAULT '[]' | add-on lines {name, price, qty} |
| status | TEXT | pending / confirmed / checked_in / checked_out / cancelled |
| total | REAL | base + extras, pre-tax |
| source | TEXT DEFAULT 'staff' | staff / online |
| reference | TEXT | guest-facing code e.g. ARY-XXXXX |
| guest_account_id | INTEGER DEFAULT 0 | set when a logged-in guest books |
| created_at | TEXT | |

## Tables (NEW)

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| number | TEXT UNIQUE | e.g. T1 |
| seats | INTEGER DEFAULT 4 | |
| status | TEXT DEFAULT 'free' | free / occupied / reserved |

## Order Items (modified)

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| order_id | FK orders | |
| item_name | TEXT | |
| price | REAL | |
| qty | INTEGER | |
| kot_status | TEXT DEFAULT 'draft' | draft / new / preparing / served |
| kot_time | TEXT | when sent to kitchen |

## Bills (unchanged)

| Column | Notes |
|---|---|
| type | ROOM / RESTAURANT / POS |
| ref_id | booking id or order id |
| guest_id / guest_name | |
| items_json | |
| subtotal / tax / total | tax from settings |
| payment_method | cash / card / upi / bank |
| paid | 1 |

## Housekeeping Tasks (NEW)

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| room_id | FK rooms | |
| task | TEXT | e.g. "Full clean", "Change linens" |
| assignee | TEXT DEFAULT '' | staff name |
| status | TEXT DEFAULT 'pending' | pending / in-progress / done |
| scheduled_at | TEXT | |
| created_at | TEXT | |

## Hotel Settings (unchanged)

brand name/address/phone/tax_rate + new: `currency_symbol` (default ₹), `welcome_message` (public site hero).

## State Transitions

**Booking**: pending → confirmed → checked_in → checked_out (creates bill, room→cleaning→available). Cancelled allowed from pending or confirmed (frees room). Editing allowed while pending/confirmed.

**Room.status**: available → reserved (confirmed) → occupied (check-in) → cleaning (check-out) → available (hk done). Cancel frees to available (or cleaning if it had been checked in — but cancellation from checked-in is not allowed).

**Order item KOT**: draft → new (sent to kitchen) → preparing → served.

**Table.status**: free → occupied (open order) → free (bill settled/cancelled).

**Housekeeping task**: pending → in-progress → done.

## Double-booking rule

A room cannot be booked if an existing booking (status pending/confirmed/checked_in) overlaps [check_in, check_out). Enforced by SQL query in the bookings POST and PUT handlers.

## Validation

- check_in ≥ today for new bookings (staff may backdate for walk-ins? default: allowed only if room free).
- check_out > check_in.
- price/nights ≥ 1.
- guests name required; phone recommended.
- KOT requires ≥ 1 item with qty ≥ 1.
- Users: username unique, role in allowed set, password ≥ 6 chars on create/change.