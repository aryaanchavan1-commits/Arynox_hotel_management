# Feature Specification: Hotel ERP Overhaul — Login, Booking, Restaurant, Hotel Management

**Feature Branch**: `001-hotel-erp-overhaul`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "make perfect login system and also erps for room booking, restaurant erp and hotel management and every and all features perfectly and all 2026 options" — using QloApps, hotel-mgmt-system, Hotel-Management-System, gssoc2021-HotelOnTouch as UI/UX and feature references.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure staff login with roles (Priority: P1)

Hotel staff (manager, receptionist, kitchen, restaurant waiter) sign in with their own username and password. No more auto-login; every user has a role, and the menu shows only the screens that role is allowed to use. Staff can change their own password.

**Why this priority**: Authentication is the gate for everything else — no secure login, no ERP.

**Independent Test**: Signing in as `reception` shows the Reception dashboard with Rooms/Bookings/Guests but not Settings or Users; signing in as `admin` shows everything; a wrong password shows an error and does not log in.

**Acceptance Scenarios**:

1. **Given** a staff member with role `reception`, **When** they log in with correct credentials, **Then** they reach the dashboard and the sidebar shows only their permitted modules.
2. **Given** an existing staff account, **When** the user submits a wrong password, **Then** the app shows "Invalid username or password" and stays on the login screen.
3. **Given** an admin, **When** they visit the Users screen, **Then** they can add, edit (incl. role), and disable staff accounts.
4. **Given** any logged-in user, **When** they change their password and log out, **Then** the old password no longer works and the new one does.

---

### User Story 2 - Room booking ERP with availability calendar (Priority: P1)

The front desk sees a color-coded room availability grid for a date range (green = available, blue = booked, amber = check-in today / partially available, red = unavailable). They can book a room directly, or take an online guest booking. Bookings track guest, room, dates, adults/children, extras (meal plans, add-ons), and auto-compute total from nightly price × nights. Check-in, check-out (auto-bills), and cancellation all update room status.

**Why this priority**: Room booking is the core business of the ERP.

**Independent Test**: Open the Room Availability screen for today's date; unbooked rooms are green, previously booked rooms are blue; creating a booking for a green room changes it to blue; check-out produces a paid bill and frees the room back to green.

**Acceptance Scenarios**:

1. **Given** the availability calendar, **When** I view a 7-day range, **Then** each room shows a status color per day.
2. **Given** a new booking request, **When** I pick dates, room, guest and meal/add-on extras, **Then** the total equals nightly price × nights plus extras plus tax.
3. **Given** a booking, **When** I click Check-in, **Then** the room becomes occupied and the booking status becomes checked-in.
4. **Given** a checked-in booking, **When** I click Check-out and choose a payment method, **Then** a paid bill is created and the room becomes available.
5. **Given** a booking, **When** I cancel it, **Then** the room is freed and the booking status is cancelled.

---

### User Story 3 - Perfect public guest booking website (Priority: P1)

The hotel's public website is a complete, polished, mobile-first hotel website. It has: hero banner, room showcase (photos, amenities, prices), facilities section, gallery, contact & location, and a booking flow (search availability by dates + guest count → see only free rooms with live nightly totals → guest details → confirmation with reference). It runs entirely separately from the ERP: **the public never sees the staff app**. It renders beautifully on phones.

**Why this priority**: Direct online bookings are the fastest source of revenue and the guest-facing site is the "face" of the hotel; the user explicitly asked for a perfect website that hides the ERP and is perfect on mobile.

**Independent Test**: Open the public site on a phone (or tablet viewport) — the header, hero, room cards, and booking form all fit and work without horizontal scroll; search a date range with 2 adults, pick a room, submit the booking → confirmation shows a reference; the staff Bookings screen shows the booking as pending. There is no way to reach the ERP from the public site.

**Acceptance Scenarios**:

1. **Given** the public homepage, **When** I enter check-in, check-out, adults and children, **Then** I see only rooms that are free for those nights with correct total price.
2. **Given** a selected room, **When** I submit the guest booking form, **Then** a booking is created with status pending and a reference is shown.
3. **Given** a pending online booking, **When** front-desk staff open Bookings, **Then** they can confirm, edit, or decline it.
4. **Given** the public site on a mobile viewport, **Then** every public page renders without horizontal scrolling and the booking flow is fully usable.
5. **Given** an anonymous public visitor, **Then** they can only see the public booking site — never any ERP screens or staff login.

---

### User Story 3b - Guest signup & account portal (Priority: P2)

Visitors can create a guest account (signup with name, email, phone, password) on the public site, log in, and view their bookings ("My Bookings") with reference, dates, room, total, and status. Guests can cancel their own pending bookings. This is separate from staff accounts: a guest account can never log into the ERP.

**Why this priority**: Account creation improves guest trust, enables booking management, and was explicitly requested alongside signup.

**Independent Test**: On the public site, sign up with an email; log in; make a booking; "My Bookings" shows it; cancel it while pending; staff see the cancellation. A guest account used at the staff login fails.

**Acceptance Scenarios**:

1. **Given** the public site, **When** I sign up with name/email/phone/password, **Then** an account is created and I am logged in.
2. **Given** a logged-in guest, **When** they book a room, **Then** the booking appears under My Bookings.
3. **Given** a pending booking in My Bookings, **When** the guest cancels it, **Then** it becomes cancelled and the room is freed.
4. **Given** a guest account, **When** they try to log into the staff ERP, **Then** login fails with "no such staff account".

---

### User Story 4 - Restaurant ERP with tables, KOT and kitchen display (Priority: P1)

The restaurant module manages tables (add/edit/assign), a food & beverage menu, and waiter orders. When a waiter saves an order, a **kitchen order ticket (KOT)** is generated and appears on a **kitchen display screen** with item, qty, table, time and status (new → preparing → served). Waiters can send items to kitchen separately, mark them served, and settle the bill with cash/card/UPI or split/send to room folio.

**Why this priority**: Restaurant and room-service orders drive most daily revenue alongside rooms; the reference systems all had only stub F&B.

**Independent Test**: On the Restaurant screen, open Table 3, add 2 items, send to kitchen → the Kitchen Display screen shows those items; kitchen marks prepared; waiter marks served; settling the bill creates a paid bill and clears the table.

**Acceptance Scenarios**:

1. **Given** an open table order, **When** items are sent to kitchen, **Then** they appear on the Kitchen Display with table, time and status `new`.
2. **Given** items on the kitchen display, **When** kitchen marks them prepared, **Then** status changes to `preparing`/`served` as applicable.
3. **Given** a table with completed items, **When** the waiter settles with a payment method, **Then** a paid bill is created and the table is freed.
4. **Given** a room-folio option, **When** the bill is sent to the guest's room, **Then** it is charged to the room booking's total.

---

### User Story 5 - Hotel management: housekeeping, guests, reports (Priority: P2)

Housekeeping tracks room status (clean, dirty, in-progress, out-of-order) with a task board; housekeeping staff update status as they work. The Guests module keeps a full guest registry (profile, ID, contact, stay history, folio balance). Reports give occupancy, revenue (today/week/month), restaurant vs room split, pending bookings, housekeeping status, and export to CSV.

**Why this priority**: Beyond booking and dining, this is what makes it a "hotel management" ERP; covers the reference systems' best reporting and housekeeping gaps.

**Independent Test**: Mark a room dirty after check-out → it shows on the housekeeping board; mark it cleaned → board reflects clean; the Reports screen shows today's revenue split between rooms and restaurant and the occupancy %.

**Acceptance Scenarios**:

1. **Given** a checkout, **Then** the room's housekeeping status becomes dirty and appears on the housekeeping board.
2. **Given** a housekeeper, **When** they mark the room cleaned, **Then** the board shows it as clean and available again.
3. **Given** bills, **Then** Reports shows revenue by source (room/restaurant/POS), occupancy %, and pending bookings.
4. **Given** any list on Reports, **When** I click Export, **Then** a CSV file downloads.

---

### User Story 6 - Modern 2026 UI/UX (Priority: P2)

The whole app adopts a modern 2026 look inspired by the reference systems: a clean login screen, a polished sidebar shell, cards, charts, dark mode toggle, responsive layout (works on tablet at the front desk), toast notifications, and a color-coded room grid. The public site has a hero, room showcase, facilities, and contact sections.

**Why this priority**: The reference repos' dated UIs were explicitly called out; polish is what makes it "perfect".

**Independent Test**: Toggle dark mode persists across reload; dashboard renders charts; a tablet-width screen shows the availability grid without horizontal scroll; creating/updating records shows a toast.

**Acceptance Scenarios**:

1. **Given** the app, **When** I toggle dark mode, **Then** the preference persists and all screens restyle.
2. **Given** the dashboard, **When** it loads, **Then** KPI cards and revenue/occupancy charts render with live data.
3. **Given** any create/update action, **When** it succeeds or fails, **Then** a toast notification appears.
4. **Given** a phone/tablet viewport, **Then** core screens remain usable without horizontal scrolling.

---

### Edge Cases

- Booking dates overlapping an existing booking on the same room must be rejected with a clear message.
- Check-out with unpaid extras: the bill must include them and show the correct grand total.
- Cancelling a checked-in booking must not be allowed without check-out first.
- Login after JWT expiry → user is taken back to the login screen, not an endless spinner.
- Online booking for a room that just became unavailable → show "no rooms available" gracefully.
- Kitchen order with an empty item list must not be created.
- Disabled staff cannot log in.
- Two users changing settings concurrently: last write wins (acceptable).
- Export with zero rows still downloads a valid CSV with headers.
- Anonymous public visitors must never reach ERP routes or the staff login (separate navigation, separate auth token keys, role guard on every staff API).
- Guest signup with an already-registered email must show "email already registered".
- Guest cancellation is allowed only while the booking is pending; confirmed bookings require staff.
- A staff member's email and a guest's email are separate concerns: staff login uses username, guest login uses email.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a login screen (no auto-login) accepting username + password and returning a JWT.
- **FR-002**: System MUST support staff roles: admin, manager, reception, kitchen, restaurant, housekeeping with a permission matrix controlling sidebar menu and API access.
- **FR-003**: System MUST allow admins to create, edit, disable, and change-password for staff accounts; users MUST be able to change their own password.
- **FR-004**: System MUST issue a session token that expires and requires re-login (with a "stay signed in" option).
- **FR-005**: System MUST provide a color-coded room availability grid for a date range with per-room statuses.
- **FR-006**: System MUST support bookings with guest, room(s), dates, adults/children, meal plan, add-ons/extras, and auto total = price × nights + extras + tax.
- **FR-007**: System MUST enforce no double-booking of a room for overlapping dates.
- **FR-008**: System MUST support booking lifecycle: pending → confirmed → checked-in → checked-out (bill) and cancelled.
- **FR-009**: System MUST support check-out auto-billing with configurable payment methods (cash, card, UPI, bank) and extras.
- **FR-010**: System MUST provide a public guest booking website (no login) with room search, availability, and guest booking submission.
- **FR-011**: System MUST create online bookings as pending in the staff queue with a guest-facing reference.
- **FR-012**: System MUST manage restaurant tables with open/completed status.
- **FR-013**: System MUST generate KOTs for kitchen with per-item status flow (new → preparing → served).
- **FR-014**: System MUST provide a Kitchen Display Screen with live order tickets.
- **FR-015**: System MUST support restaurant bill settlement (cash/card/UPI) and charging to a room folio.
- **FR-016**: System MUST track housekeeping room status (clean, dirty, in-progress, out-of-order) with a task board.
- **FR-017**: System MUST provide reports: occupancy, revenue by source and period, pending bookings, housekeeping status; with CSV export.
- **FR-018**: System MUST preserve the existing modules (rooms, guests, menu, POS, receipts, AI assistant, settings, thermal printing) and integrate them under the new role system.
- **FR-019**: System MUST persist data in the existing Turso/offline SQLite backend and keep all existing endpoints working.
- **FR-020**: System MUST support dark mode, responsive layout, toasts, and charts.
- **FR-021**: System MUST guard all API routes by role in addition to token validity.
- **FR-022**: System MUST support guest signup (name, email, phone, password) and guest login via email, kept fully separate from staff accounts.
- **FR-023**: System MUST provide a "My Bookings" portal for logged-in guests showing their bookings (reference, dates, room, total, status) and allowing cancellation of pending bookings.
- **FR-024**: System MUST keep the public booking site and the staff ERP fully separated: anonymous/guest users only ever see public pages; staff login and ERP screens require a staff session.
- **FR-025**: System MUST render the public booking site perfectly on mobile (no horizontal scroll, usable touch targets, responsive images/layout).

### Key Entities

- **User**: staff account (username, password hash, name, role, enabled).
- **GuestAccount**: guest-facing account (name, email, phone, password hash), separate from staff users.
- **Role/Permission**: role name → allowed modules.
- **RoomType**: name, price, capacity, description, amenities, image.
- **Room**: number, floor, type, status, housekeeping status.
- **Guest**: name, phone, email, ID details, address, stay history, folio balance.
- **Booking**: guest, room, check-in/out, adults/children, meal plan, extras, status, total, source (online/staff).
- **Table**: number, seats, status.
- **MenuCategory / MenuItem**: name, category, price, available.
- **Order / OrderItem**: table, items, status, KOT status per item.
- **Bill**: type (ROOM/RESTAURANT/POS), items, subtotal, tax, total, payment method, paid.
- **HousekeepingTask**: room, task, assignee, status, scheduled time.
- **HotelSetting**: brand, address, phone, tax rate.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A staff member can complete login → dashboard in under 5 seconds.
- **SC-002**: A front-desk booking (select room → confirm) can be created in under 1 minute from the availability grid.
- **SC-003**: A guest can complete an online booking (search → room → form → confirmation) in under 2 minutes on both desktop and mobile.
- **SC-004**: A restaurant order can be sent to the kitchen display in under 10 seconds after adding items.
- **SC-005**: No double-booking is possible: overlapping dates on the same room are always rejected.
- **SC-006**: 100% of existing API endpoints remain functional and all live site checks (login, summary, settings, bills, receipts, AI) still pass.
- **SC-007**: Role-restricted users cannot reach modules they are not permitted to (verified per role).
- **SC-008**: Reports figures match the underlying bills/booking data (spot-checked on live data).
- **SC-009**: An anonymous/guest visitor can never reach any ERP screen or staff login (verified by navigating every public page and checking no staff link exists).
- **SC-010**: The public site renders without horizontal scrolling on a 375px-wide mobile viewport across all public pages.
- **SC-011**: A guest can sign up, log in, and cancel their own pending booking end-to-end without staff assistance.

## Assumptions

- The existing Next.js single-app architecture and Turso/offline SQLite data layer are retained and extended.
- The public guest site and the staff ERP live in the same app but are fully separated at the routing/auth level: separate token storage keys (`arynox_token` for staff, `arynox_guest_token` for guests), separate route namespaces, and staff-role API guards. No separate deployment.
- Staff login uses username; guest login uses email — two distinct credential spaces.
- Admin credentials remain `admin/admin123` for first login; users can change passwords thereafter.
- Currency is INR (₹) with the existing tax rate setting; multi-currency is out of scope.
- Multi-language is out of scope; UI text is English.
- No real payment gateway integration — payment methods are recorded (cash/card/UPI/bank) and receipts are printed. Online bookings do not require payment at booking time.
- Dark mode uses a CSS class toggled by the user, persisted in localStorage.
- The reference repos are used for UI/UX inspiration and feature coverage, not copied verbatim.