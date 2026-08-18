import React, { useEffect, useRef, useState } from 'react';
import { post } from '../api.js';

const QUICK = ['Do you have rooms available?', 'What are your facilities?', 'Where are you located?', 'How do I book?'];

export default function ChatWidget({ brand }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ role: 'ai', text: `👋 Welcome to ${brand?.hotel_name || 'Hotel Lakshmi Elite'}! Ask me about rooms, rates, facilities or how to book.` }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, open]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || busy) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text: msg }]);
    setBusy(true);
    try {
      const history = msgs.filter((m) => m.role === 'user' || m.role === 'ai').slice(-6);
      const r = await post('/api/public/chat', { message: msg, history });
      setMsgs((m) => [...m, { role: 'ai', text: r.reply || 'Sorry, I could not answer that right now.' }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: 'ai', text: 'I am temporarily unavailable. Please call or email the hotel directly.' }]);
    }
    setBusy(false);
  };

  return (
    <>
      <button className="chat-fab" title="Chat with us" onClick={() => setOpen((o) => !o)}>{open ? '✕' : '💬'}</button>
      {open && (
        <div className="chat-panel glass">
          <div className="chat-panel-head">
            <b>💬 {brand?.hotel_name || 'Hotel Lakshmi Elite'}</b>
            <span>Online — replies instantly</span>
          </div>
          <div className="chat-panel-msgs">
            {msgs.map((m, i) => (
              <div key={i} className={'chat-m ' + m.role}>{m.text}</div>
            ))}
            {busy && <div className="chat-m ai">⏳ typing…</div>}
            <div ref={endRef} />
          </div>
          <div className="chat-panel-quick">
            {QUICK.map((q) => <button key={q} onClick={() => send(q)}>{q}</button>)}
          </div>
          <div className="chat-panel-input">
            <input placeholder="Type a question…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
            <button className="btn primary" onClick={() => send()} disabled={busy}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}
