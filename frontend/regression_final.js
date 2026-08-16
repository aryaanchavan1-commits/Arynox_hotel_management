const { execSync } = require('child_process');
const fs = require('fs');
const base = 'http://127.0.0.1:5183';
const T = 'C:\\Users\\ARYANC~1\\AppData\\Local\\Temp\\opencode';
fs.writeFileSync(`${T}\\login.json`, JSON.stringify({ username: 'admin', password: 'admin123' }));
function ag(u, token){ try { return execSync(`curl.exe -s "${u}" -H "Authorization: Bearer ${token}"`, {encoding:'utf8'}).trim(); } catch { return '{}'; } }
function ap(u, file, token){ try { return execSync(`curl.exe -s -X POST "${u}" -H "Authorization: Bearer ${token||''}" -H "Content-Type: application/json" --data-binary "@${file}"`, {encoding:'utf8'}).trim(); } catch { return '{}'; } }

const loginResp = ap(`${base}/api/auth/login`, `${T}\\login.json`, '');
const tok = JSON.parse(loginResp).token;
console.log('01 login staff:', tok?'OK':'FAIL');

// offline booking with id proof — pick a free room + unique far-future dates to avoid overlap with prior test data
const rooms = JSON.parse(ag(`${base}/api/rooms`, tok));
const room = rooms.find(r => r.status === 'available') || rooms[0];
const off = 700 + Math.floor(Math.random() * 400);
const ci = new Date(Date.now() + off * 86400000).toISOString().slice(0, 10);
const co = new Date(Date.now() + (off + 3) * 86400000).toISOString().slice(0, 10);
const ob = JSON.stringify({ guest_id: 1, room_id: room.id, check_in: ci, check_out: co, adults:2, children:0, status:'confirmed', meal_plan:'half_board', source:'staff', payment_status:'unpaid', id_proof_base64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+B8AAQUBAScJTYk=', id_proof_name:'lic.png', id_proof_mime:'image/png' });
fs.writeFileSync(`${T}\\ob.json`, ob);
const createdRaw = ap(`${base}/api/bookings`, `${T}\\ob.json`, tok);
const created = JSON.parse(createdRaw);
if (!created.id) console.log('02 create response:', createdRaw.slice(0, 300));
console.log('02 offline booking created:', created.reference, 'id='+created.id);

const list = JSON.parse(ag(`${base}/api/bookings`, tok));
const found = list.find(r=>r.reference===created.reference);
console.log('03 list row:', 'has_id_proof='+found.has_id_proof, 'payment_status='+found.payment_status, 'source='+found.source);

const doc = JSON.parse(ag(`${base}/api/bookings/${found.id}/document`, tok));
console.log('04 document:', 'base64='+!!doc.base64, 'mime='+doc.mime);

fs.writeFileSync(`${T}\\mp.json`, JSON.stringify({ method: 'cash' }));
const mp = JSON.parse(ap(`${base}/api/bookings/${found.id}/mark-paid`, `${T}\\mp.json`, tok));
console.log('05 mark-paid:', mp.ok ? 'OK' : ('FAIL ' + (mp.error || JSON.stringify(mp))));

fs.writeFileSync(`${T}\\po.json`, JSON.stringify({ booking_id: found.id, currency:'INR' }));
const po = JSON.parse(ap(`${base}/api/payments/create-order`, `${T}\\po.json`));
console.log('06 payments (no key):', po.error ? 'OK 501 -> ' + po.error : 'unexpected (' + JSON.stringify(po) + ')');

const sum = JSON.parse(ag(`${base}/api/reports/summary`, tok));
console.log('07 summary: unpaid='+sum.unpaidBookings+', newWebBookings='+sum.newWebBookings);

const exp = JSON.parse(ag(`${base}/api/export`, tok));
console.log('08 export tables:', Object.keys(exp).length, 'bookings:', exp.bookings.length);

console.log('\nALL: see above');
