# Quickstart: Hotel ERP Overhaul

**Date**: 2026-08-16 | Runnable end-to-end validation scenarios (manual, no implementation code).

## Prerequisites
- `node` installed; repo root `D:\Arynoxtech\Arynoxtech_hotel_management`
- `.env` present at repo root (contains `DB_LOCAL=true` for local, Turso creds for online)
- Run via: `npm run dev` in `frontend/` (or `npm run build && npm start` on :5173)

## Scenario 1 — Login & roles
1. Open http://localhost:5173 → a real login screen appears (NO auto-login).
2. Wrong password → "Invalid username or password".
3. Login `admin`/`admin123` → Dashboard; sidebar shows all modules incl. Users.
4. Login `reception`/`reception123` → sidebar has no Users/Settings.
5. As admin, create user role `kitchen`; log out; log in as kitchen → only Kitchen/Dashboard/Reports/Assistant.
6. Change own password; log out; old password fails, new works.

## Scenario 2 — Room availability + booking lifecycle
1. Login reception. Open Availability → grid of rooms × 7 days, green/blue/amber colors.
2. Create booking: Standard Room, today→+2, 2 adults, meal plan breakfast, add extra "Extra bed ₹500".
3. Total = (1499×2) + 500 = ₹3,498 base (+ tax on checkout).
4. Grid shows the room booked (blue) for those nights.
5. Attempt second booking same room overlapping → rejected with clear message (409).
6. Check-in → room occupied (grid amber today, blue rest).
7. Check-out with method UPI → paid bill created (₹3,498 + 5% tax = ₹3,672.90), room becomes cleaning then available.
8. Cancel test: create booking, cancel → room free.

## Scenario 3 — Public guest booking site (perfect website, mobile-first)
1. Open http://localhost:5173 logged-out → guest homepage: hero, room showcase, facilities, gallery, contact, footer. No ERP links anywhere.
2. Navigate (desktop) → Rooms → search check-in today, check-out +3, 2 adults → free rooms listed with totals.
3. Pick a room, fill guest form, submit → confirmation with reference `ARY-xxxxx`.
4. **Guest signup**: click Sign Up, enter name/email/phone/password → logged in. Make another booking → appears in My Bookings.
5. In My Bookings, cancel the pending booking → becomes cancelled, room freed.
6. Try the staff login with the guest email/password → rejected ("no such staff account").
7. Login reception → Bookings shows online bookings as pending; confirm; grid updates.
8. **Mobile check**: set viewport to 375px — hero, room cards, booking form, My Bookings all render without horizontal scroll.

## Scenario 4 — Restaurant ERP + kitchen display
1. Login restaurant. Tables T1–T10 visible. Open T3, add 2 items, save, Send to Kitchen.
2. Login kitchen (different browser/incognito). Kitchen display shows T3 items status `new`.
3. Kitchen marks preparing → served.
4. Back as restaurant: mark served (waiter view), settle bill cash → paid bill, table freed.
5. Reorder on a checked-in guest's table; settle → Charge to room → appears on room bill at check-out.

## Scenario 5 — Housekeeping
1. After a check-out, Rooms/Housekeeping board shows that room `dirty`.
2. Create task "Full clean" assign housekeeper; mark in-progress → done.
3. Room returns to available/clean; grid shows green again.

## Scenario 6 — Reports & export
1. Reports shows occupancy %, revenue today split Room/Restaurant/POS, pending bookings, housekeeping dirty count.
2. Export daily revenue → valid CSV downloads.
3. Dashboard charts render with live data.

## Scenario 7 — UI/UX
1. Toggle dark mode → persists after reload.
2. Resize to tablet width → availability grid scrolls horizontally without breaking layout.
3. Any create/update shows a toast.

## Live verification (after deploy)
Repeat Scenario 1 (login only), 2 (summary), 3 (public booking), 6 (summary + export) against https://arynox-hotel-erp.vercel.app, plus existing endpoints: `/api/health`, `/api/settings`, `/api/reports/summary`, receipts html/escpos, AI chat.