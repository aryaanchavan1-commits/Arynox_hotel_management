import React from 'react';

export default function PublicConfirm({ confirm, setConfirm }) {
  if (!confirm) {
    return (
      <div className="public-section" style={{ textAlign: 'center' }}>
        <div className="empty">No booking found. Start a new booking.</div>
        <a className="btn primary" href="#/booking" style={{ marginTop: 16 }}>Book a room</a>
      </div>
    );
  }
  return (
    <section className="public-section" style={{ maxWidth: 560, margin: '30px auto' }}>
      <div className="public-form" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 46 }}>✅</div>
        <h2 style={{ margin: '8px 0' }}>Booking confirmed!</h2>
        <p className="sub">Thank you for choosing {confirm.hotel_name}. Your booking is pending confirmation by our front desk.</p>
        <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 16, margin: '18px 0', textAlign: 'left' }}>
          <div className="between"><b>Reference</b><b style={{ color: 'var(--primary)' }}>{confirm.reference}</b></div>
          <div className="between"><b>Room</b><span>{confirm.room_number}</span></div>
          <div className="between"><b>Check-in</b><span>{confirm.check_in}</span></div>
          <div className="between"><b>Check-out</b><span>{confirm.check_out}</span></div>
          <div className="between"><b>Total</b><b>{confirm.currency_symbol || '₹'}{confirm.total}</b></div>
        <div className="between"><b>Payment</b><b>{confirm.payment_status === 'paid' ? '💰 Paid' : '💳 ' + (confirm.payment_method === 'stripe' ? 'Paid online' : 'Pay at hotel')}</b></div>
        </div>
        <p className="sub" style={{ textAlign: 'center', fontSize: 12, marginTop: -6 }}>
          Your booking is pending confirmation by our front desk. If you uploaded an ID proof, it will be reviewed.
        </p>
        <a className="btn primary" href="#/" onClick={() => setConfirm(null)}>Back to home</a>{' '}
        <a className="btn" href="#/guest/my-bookings">My Bookings</a>
      </div>
    </section>
  );
}