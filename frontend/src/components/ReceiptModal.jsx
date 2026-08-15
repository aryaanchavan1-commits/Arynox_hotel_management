import React, { useEffect, useState } from 'react';
import { BASE } from '../api.js';

export default function ReceiptModal({ bill, onClose }) {
  const [full, setFull] = useState(null);
  const [printerIp, setPrinterIp] = useState('192.168.1.');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (bill && bill.items) { setFull(bill); return; }
    if (bill && bill.id) {
      fetch(`${BASE}/api/bills/${bill.id}`, { headers: { Authorization: 'Bearer ' + localStorage.getItem('arynox_token') } })
        .then((r) => r.json())
        .then((b) => b && b.items !== undefined && setFull(b))
        .catch(() => {});
    }
  }, [bill]);

  if (!full) return null;

  const printBrowser = () => window.open(`${BASE}/api/receipts/${full.id}/html?token=${localStorage.getItem('arynox_token')}`, '_blank');

  const downloadEscPos = async () => {
    const res = await fetch(`${BASE}/api/receipts/${full.id}/escpos`, { headers: { Authorization: 'Bearer ' + localStorage.getItem('arynox_token') } });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `receipt-${full.id}.bin`;
    a.click();
  };

  const printThermal = async () => {
    setBusy(true);
    setMsg('printing…');
    try {
      const res = await fetch(`${BASE}/api/receipts/${full.id}/escpos`, { headers: { Authorization: 'Bearer ' + localStorage.getItem('arynox_token') } });
      const buf = await res.arrayBuffer();
      const data = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const bridge = await fetch('http://localhost:8765/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: printerIp, port: 9100, data }),
      });
      const r = await bridge.json();
      setMsg(r.ok ? `✅ Sent to ${printerIp}:9100` : `❌ ${r.error}`);
    } catch (e) {
      setMsg('❌ Bridge not running (start via run.bat) or printer unreachable: ' + e.message);
    }
    setBusy(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>🧾 Receipt #{full.id} <span className="badge paid">{full.type} · {full.payment_method.toUpperCase()}</span></h3>
        <div className="receipt-preview">
          <div className="c"><b>ARYNOX GRAND HOTEL</b></div>
          <div className="line2">BILL #{full.id} · {full.created_at?.slice(0, 16)}</div>
          {full.guest_name && <div className="c">Guest: {full.guest_name}</div>}
          {(full.items || []).map((it, i) => (
            <div key={i} className="row2"><span>{it.name} ×{it.qty || 1}</span><span>₹{(Number(it.price) * (it.qty || 1)).toFixed(2)}</span></div>
          ))}
          <div className="line2" />
          <div className="row2"><span>Subtotal</span><span>₹{Number(full.subtotal).toFixed(2)}</span></div>
          <div className="row2"><span>Tax</span><span>₹{Number(full.tax).toFixed(2)}</span></div>
          <div className="row2 total"><b>TOTAL</b><span><b>₹{Number(full.total).toFixed(2)}</b></span></div>
          <div className="c line2" style={{ marginTop: 8 }}>Thank you! Visit again 💐</div>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={printBrowser}>🖨️ Browser print</button>
          <button className="btn" onClick={downloadEscPos}>📄 ESC/POS file</button>
          <button className="btn primary" onClick={printThermal} disabled={busy}>🖨️ Thermal (LAN 9100)</button>
        </div>
        <div className="printer-row">
          <input value={printerIp} onChange={(e) => setPrinterIp(e.target.value)} placeholder="Printer IP" />
          {msg && <small>{msg}</small>}
        </div>
        <button className="btn ghost close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}