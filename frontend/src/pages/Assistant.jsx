import React, { useEffect, useRef, useState } from 'react';
import { post } from '../api.js';

const SUGGESTIONS = [
  'What is today\'s occupancy?',
  'How much revenue today?',
  'Which rooms are available for tomorrow?',
  'Find a guest named Raj',
  'What are the best selling items?',
  'Show me recent bookings',
];

export default function Assistant() {
  const [msgs, setMsgs] = useState([{ role: 'ai', text: '👋 Hello! I\'m the Arynox AI assistant. Ask me about occupancy, revenue, rooms, guests or menu — I can query live data.' }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async (text) => {
    const msg = text || input;
    if (!msg.trim() || busy) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text: msg }]);
    setBusy(true);
    try {
      const r = await post('/ai/chat', { message: msg });
      setMsgs((m) => [...m, { role: 'ai', text: r.reply }]);
      if (r.needsKey) {
        setMsgs((m) => [...m, { role: 'ai', text: '📌 Setup: 1) Get a free Groq API key at https://console.groq.com → API Keys. 2) Put it in .env as GROQ_API_KEY=your-key. 3) Restart backend. (Locally just rerun run.bat; on Render/Vercel update the env var.)' }]);
      }
    } catch (e) {
      setMsgs((m) => [...m, { role: 'ai', text: 'Error: ' + e.message }]);
    }
    setBusy(false);
  };

  return (
    <div>
      <div className="between">
        <h1>🤖 AI Assistant</h1>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>Powered by Groq (llama-3.3-70b)</span>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="chat">
          <div className="chat-msgs">
            {msgs.map((m, i) => (
              <div key={i} className={'bubble ' + m.role}>{m.text}</div>
            ))}
            {busy && <div className="bubble ai">⏳ thinking…</div>}
            <div ref={endRef} />
          </div>
          <div className="row">
            {SUGGESTIONS.map((s) => <button key={s} className="suggest" onClick={() => send(s)}>{s}</button>)}
          </div>
          <div className="chat-input">
            <input placeholder="Ask anything… (e.g. occupancy today, revenue, available rooms)" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
            <button className="btn primary" onClick={() => send()} disabled={busy}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}