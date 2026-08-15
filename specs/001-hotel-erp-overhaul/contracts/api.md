# API Contracts & Role Matrix: Hotel ERP Overhaul

**Date**: 2026-08-16

## Role → Module permission matrix

| Module | admin | manager | reception | restaurant | kitchen | housekeeping |
|---|---|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Availability / Rooms | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ (view) |
| Bookings | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Guests | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Restaurant | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Kitchen display | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Housekeeping | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| POS / Billing | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Reports | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| AI Assistant | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

Server-side guard checks: `allowedRoles(route)` — see below.

## Endpoints

### Auth — staff (kind=staff tokens)
- `POST /api/auth/login` (public) → `{ token, user: {id, name, role, username} }` (401 on bad creds / disabled)
- `POST /api/auth/logout` (all roles) → `{ ok: true }` (client clears storage)
- `PUT /api/auth/password` (all) body `{ oldPassword, newPassword }` → `{ ok: true }` (401 if old wrong)
- `GET /api/auth/me` (all) → user payload

### Auth — guests (kind=guest tokens, separate credential space)
- `POST /api/guest/signup` (public) `{ name, email, phone, password }` → `{ token, user: {id, name, email} }` (409 on duplicate email)
- `POST /api/guest/login` (public) `{ email, password }` → `{ token, user: {id, name, email} }` (401 on bad creds)
- `GET /api/guest/my-bookings` (guest token) → `[{ reference, room_number, room_type, check_in, check_out, adults, children, meal_plan, total, status, created_at }]`
- `POST /api/guest/bookings/:id/cancel` (guest token, own pending booking only) → `{ ok: true }` (403 otherwise)

### Users (admin)
- `GET /api/users` → `[{ id, username, name, role, enabled }]`
- `POST /api/users` `{ username, password, name, role }` → `{ id }`
- `PUT /api/users/:id` `{ name, role, enabled }` → `{ ok: true }`
- `POST /api/users/:id/password` `{ newPassword }` → `{ ok: true }`

### Availability & bookings (reception/manager/admin)
- `GET /api/availability?from=YYYY-MM-DD&to=YYYY-MM-DD` → `{ days: [...], rooms: [{ id, number, type, floor, status, typeName, price, perDay: ['available'|'booked'|'checkin'|'ooo'|'cleaning'] }] }`
- `GET /api/bookings` → list (existing) + `meal_plan`, `extras`, `reference`, `source`
- `POST /api/bookings` (staff) `{ guest_id, room_id, check_in, check_out, adults, children, meal_plan, extras, status }` → `{ id, total }` (409 on overlap)
- `PUT /api/bookings/:id` `{ check_in, check_out, adults, children, meal_plan, extras, room_id }` → `{ ok, total }` (409 on overlap)
- `POST /api/bookings/:id/confirm` → `{ ok }`
- `POST /api/bookings/:id/checkin` (existing) — sets room occupied
- `POST /api/bookings/:id/checkout` (existing) — creates bill incl. extras + folio charges; room→cleaning
- `POST /api/bookings/:id/cancel` (existing) — frees room

### Guests (reception/manager/admin) — existing, unchanged

### Restaurant (restaurant/manager/admin)
- `GET /api/tables` → `[{ id, number, seats, status }]`
- `POST /api/tables` `{ number, seats }` → `{ id }`
- `PUT /api/tables/:id` `{ number, seats, status }` → `{ ok }`
- `GET /api/orders` (existing) — include `kot_status` per item
- `POST /api/orders` (existing)
- `POST /api/orders/:id/items` (existing)
- `POST /api/orders/:id/kot` → marks all draft items `new`, sets `kot_time`, updates table to occupied, → `{ ok }`
- `PUT /api/order-items/:id/status` `{ kot_status }` (kitchen: preparing/served) → `{ ok }`
- `POST /api/orders/:id/pay` (existing) — bill RESTAURANT; frees table
- `POST /api/orders/:id/folio` `{ bookingId, method }` → creates bill ROOM linked to booking; adds to booking total (extras)

### Kitchen (kitchen/restaurant/manager/admin)
- `GET /api/orders?scope=kitchen` → orders with items where `kot_status IN ('new','preparing')`

### Housekeeping (housekeeping/admin/manager)
- `GET /api/housekeeping` → `{ rooms: [{ id, number, hk_status }], tasks: [{ id, room_id, room_number, task, assignee, status, scheduled_at }] }`
- `PUT /api/rooms/:id/hk` `{ hk_status }` → `{ ok }`
- `POST /api/rooms/:id/hk-task` `{ task, assignee, scheduled_at }` → `{ id }`
- `PUT /api/housekeeping/:id` `{ status, assignee }` → `{ ok }`

### Public guest site (public)
- `GET /api/public/hotels` → `{ settings: {hotel_name, address, phone, welcome_message}, roomTypes: [{ id, name, price, capacity, description, amenities, image }] }`
- `POST /api/public/bookings` `{ room_type_id, check_in, check_out, adults, children, name, phone, email, id_type, id_number, address }` → assigns first free room of that type, creates booking (status pending, source online, reference ARY-XXXXX), links `guest_account_id` if a valid guest token is present, → `{ reference, total, check_in, check_out, room_number, hotel_name }` (409 if none free)

### Reports (all staff)
- `GET /api/reports/summary` (extended) → adds `revenueBySource: { room, restaurant, pos }`, `pendingBookings`, `hkDirty`
- `GET /api/reports/daily` (existing)
- `GET /api/reports/occupancy` (existing)

## Error format
All errors: `{ "error": "message" }` with appropriate HTTP status (400/401/403/404/409/503). Role guard returns 403 `{ error: 'Forbidden' }`.

## Auth header
`Authorization: Bearer <JWT>` (or `?token=` for receipt links). Public endpoints skip auth.