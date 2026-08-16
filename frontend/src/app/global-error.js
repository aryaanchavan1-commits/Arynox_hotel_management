'use client';

import React from 'react';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30, background: '#0c1226', color: '#fff' }}>
          <div style={{ textAlign: 'center', maxWidth: 460 }}>
            <div style={{ fontSize: 46 }}>🏨</div>
            <h2 style={{ margin: '12px 0 6px' }}>Hotel Lakshmi Deluxe — just a hiccup</h2>
            <p style={{ color: '#aab3cc', fontSize: 14, lineHeight: 1.6 }}>
              {error?.message || 'An unexpected error occurred. Please try again.'}
            </p>
            <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                style={{ background: '#b97926', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}
                onClick={reset}>Try again</button>
              <button
                style={{ background: 'transparent', border: '1px solid #3a4468', color: '#fff', padding: '10px 20px', borderRadius: 10, cursor: 'pointer' }}
                onClick={() => { location.hash = '#/'; }}>Go home</button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}