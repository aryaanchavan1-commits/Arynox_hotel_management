// ESC/POS thermal receipt builder (58mm / 80mm) + HTML receipt view
const ESC = 0x1b, GS = 0x1d;

function buildEscPos(bill, settings) {
  const out = [];
  const raw = (...b) => out.push(...b);
  const text = (s) => { const enc = new TextEncoder(); enc.encode(String(s).replace(/[^\x00-\xFF]/g, '')).forEach((c) => out.push(c)); };
  const line = (s) => { text(s); raw(0x0a); };
  const center = (s) => { raw(ESC, 0x61, 0x01); line(s); raw(ESC, 0x61, 0x00); };
  const bold = (s) => { raw(ESC, 0x45, 0x01); line(s); raw(ESC, 0x45, 0x00); };
  const big = (s) => { raw(GS, 0x21, 0x11); bold(s); raw(GS, 0x21, 0x00); };

  raw(ESC, 0x40);                                // init
  raw(ESC, 0x61, 0x01);
  raw(GS, 0x21, 0x11); line((settings.hotel_name || 'ARYNOX_HOTEL_ERP').toUpperCase());
  raw(GS, 0x21, 0x00);
  line(settings.hotel_address || '');
  line('Tel: ' + (settings.hotel_phone || ''));
  line('--------------------------------');
  line('BILL #' + bill.id + '    ' + (bill.created_at || '').slice(0, 16));
  line('Type: ' + bill.type + '     Method: ' + bill.payment_method.toUpperCase());
  if (bill.guest_name) line('Guest: ' + bill.guest_name);
  line('--------------------------------');

  let items = [];
  try { items = JSON.parse(bill.items_json || '[]'); } catch (e) {}
  items.forEach((it) => {
    const name = String(it.name || '').slice(0, 24);
    const qty = it.qty || 1;
    const price = Number(it.price || 0);
    line(name.padEnd(24) + qty + ' x ' + price.toFixed(2));
    if (qty > 1) line(''.padEnd(24) + '= ' + (qty * price).toFixed(2));
  });
  line('--------------------------------');
  line('Subtotal'.padEnd(28) + Number(bill.subtotal || 0).toFixed(2).padStart(8));
  line('Tax'.padEnd(28) + Number(bill.tax || 0).toFixed(2).padStart(8));
  bold('TOTAL'.padEnd(28) + Number(bill.total || 0).toFixed(2).padStart(8));
  line('--------------------------------');
  line('Payment: ' + bill.payment_method.toUpperCase() + '  PAID');
  line('--------------------------------');
  center('Thank you for visiting!');
  center('We hope to see you again');
  raw(ESC, 0x61, 0x00);
  raw(ESC, 0x64, 4);                            // feed 4 lines
  raw(GS, 0x56, 0x42, 0x00);                    // full cut
  raw(ESC, 0x70, 0x00, 0x19, 0xfa);             // open cash drawer
  return Buffer.from(out);
}

function htmlReceipt(bill, settings) {
  let items = [];
  try { items = JSON.parse(bill.items_json || '[]'); } catch (e) {}
  const rows = items
    .map((it) => `<tr><td>${String(it.name)} <small>x${it.qty || 1}</small></td><td class="r">${(Number(it.price || 0) * (it.qty || 1)).toFixed(2)}</td></tr>`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Receipt #${bill.id}</title>
<style>
  body{font-family:'Courier New',monospace;width:80mm;margin:0 auto;padding:16px;color:#111}
  .c{text-align:center}.r{text-align:right}
  table{width:100%;border-collapse:collapse;font-size:13px}
  td{padding:2px 0;vertical-align:top}
  .line{border-top:1px dashed #333;margin:8px 0}
  h1{margin:0;font-size:18px}
  .big{font-size:15px;font-weight:bold}
  @media print{body{width:100%;padding:0}}
</style></head><body onload="window.print()">
<h1 class="c">${settings.hotel_name || 'ARYNOX_HOTEL_ERP'}</h1>
<div class="c">${settings.hotel_address || ''}<br>Tel: ${settings.hotel_phone || ''}</div>
<div class="line"></div>
<div>BILL #${bill.id} &nbsp; ${(bill.created_at || '').slice(0, 16)}<br>
Type: ${bill.type} &nbsp; Payment: ${bill.payment_method.toUpperCase()}</div>
${bill.guest_name ? `<div>Guest: ${bill.guest_name}</div>` : ''}
<div class="line"></div>
<table><tbody>${rows}</tbody></table>
<div class="line"></div>
<table>
<tr><td>Subtotal</td><td class="r">${Number(bill.subtotal || 0).toFixed(2)}</td></tr>
<tr><td>Tax</td><td class="r">${Number(bill.tax || 0).toFixed(2)}</td></tr>
<tr class="big"><td><b>TOTAL</b></td><td class="r"><b>${Number(bill.total || 0).toFixed(2)}</b></td></tr>
</table>
<div class="line"></div>
<div class="c">Payment: ${bill.payment_method.toUpperCase()} - PAID<br><br>
<b>Thank you! Visit again!</b></div>
</body></html>`;
}

module.exports = { buildEscPos, htmlReceipt };