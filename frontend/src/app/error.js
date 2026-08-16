'use client';

import React from 'react';

export default function Error({ error, reset }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <div style={{ textAlign: 'center', maxWidth: 460 }}>
        <div style={{ fontSize: 46 }}>😔</div>
        <h2 style={{ margin: '12px 0 6px' }}>Something went wrong</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
          {error?.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn primary" onClick={reset}>Try again</button>
          <button className="btn" onClick={() => { location.hash = '#/'; }}>Go home</button>
        </div>
      </div>
    </div>
  );
}