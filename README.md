# 🏨 Arynox_Hotel_ERP

Complete web-based Hotel Management ERP — **Hotel + Restaurant + POS + AI Assistant + Thermal Receipt Printing**, branded **Arynox_Hotel_ERP**.

Built on top of 4 reference open-source hotel systems (kept in `reference/` for study):
- [QloApps](https://github.com/Qloapps/QloApps) — full hotel reservation platform
- [hotel-mgmt-system](https://github.com/tramyardg/hotel-mgmt-system)
- [Hotel-Management-System](https://github.com/tushar-2223/Hotel-Management-System)
- [gssoc2021-HotelOnTouch](https://github.com/ayan-biswas0412/gssoc2021-HotelOnTouch)

## ✨ Features
- 🛏️ **Hotel**: rooms, room types, bookings, check-in / check-out / cancellation, guests database, auto billing on checkout
- 🍽️ **Restaurant**: menu, table orders, kitchen-friendly order list, pay & print receipt
- 💳 **POS**: tap-to-cart billing with Cash / Card / UPI, tax auto-calc
- 🧾 **Receipts**: browser print, ESC/POS file download, and direct **thermal LAN printing** (port 9100 via local bridge)
- 📈 **Reports**: live dashboard, occupancy %, revenue trends, per-room-type occupancy
- 🤖 **AI Assistant** (Groq, llama-3.3-70b): ask "occupancy today?", "revenue?", "available rooms?", "find guest…" — answers from live data via function calling
- ⚙️ **Settings**: editable brand name, address, phone and tax rate — printed on every receipt
- 🗄️ **Database**: offline SQLite file locally (`backend/data/hotel.db`), **Turso (libSQL)** online — same code, auto-switches via env

## 🚀 Run locally (Windows)
```bat
run.bat
```
Starts backend (`:5000`), printer bridge (`:8765`) and frontend (`:5173`), opens the browser.

Login: **admin / admin123** (also `reception / reception123`)

## 🌐 Deploy
Everything runs on **Vercel** (serverless) with **Turso** as the database — no separate server to keep alive.
1. **Turso DB** (online): database URL + token already in `.env`
2. **Backend → Vercel** (`arynox-hotel-api`) and **Frontend → Vercel** (`arynox-hotel-erp`), one command:
```powershell
powershell -ExecutionPolicy Bypass -File deploy.ps1
```
(reads `VERCEL_TOKEN` from `.env`, syncs env vars, deploys both projects)

Live:
- Frontend: https://arynox-hotel-erp.vercel.app
- Backend:  https://arynox-hotel-api.vercel.app/api/health

### AI Assistant setup
1. Get a free key: https://console.groq.com → API Keys
2. Add to `.env`: `GROQ_API_KEY=gsk_...`
3. Sync it to Vercel: run `deploy.ps1` (or set the env var on the `arynox-hotel-api` project in the Vercel dashboard)

### Thermal receipt printer
- Printer must be on your LAN with ESC/POS over TCP port **9100** (most network thermal printers)
- In the Receipt popup: enter printer IP → **Thermal (LAN 9100)** → printed via the local bridge (`run.bat` starts it)

## 📁 Structure
```
backend/   Express API (serverless on Vercel): auth (JWT), rooms, bookings, guests, menu,
           orders, POS, reports, receipts (ESC/POS), AI (Groq), printer bridge (local)
frontend/  React + Vite SPA: Dashboard, Rooms, Bookings, Guests, Restaurant, POS,
           Reports, AI Assistant
reference/ 4 cloned open-source hotel systems
scripts/   Turso database setup helper, logo + rebrand helpers
run.bat    local launcher   deploy.ps1  cloud deploy (Vercel frontend + backend)
```

## 🔐 Security note
`.env` (tokens) is gitignored — never commit it. Use `.env.example` as a template.