import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

const SUGGESTIONS = [
  'What are my crops and how are they doing?',
  'What is the wheat price today? Should I sell?',
  'Leaves of my tomato plants are turning yellow',
  'Set an alert when onion goes above 2000',
];

const TOOL_LABEL = {
  get_my_crops: '🌱 checked your crops',
  get_market_prices: '📈 checked mandi prices',
  get_weather: '⛅ checked weather',
  create_price_alert: '🔔 created an alert',
  log_crop_activity: '📝 logged activity',
};

export default function Advisor() {
  const [convs, setConvs] = useState([]);
  const [id, setId] = useState('new');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bottom = useRef(null);

  const loadList = () => api.get('/advisory').then(setConvs).catch(() => {});
  useEffect(() => { loadList(); }, []);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  const open = async (cid) => {
    setId(cid);
    setMessages(cid === 'new' ? [] : (await api.get(`/advisory/${cid}`)).messages);
  };

  const send = async (msg) => {
    const m = (msg ?? text).trim();
    if (!m || busy) return;
    setText('');
    setMessages((x) => [...x, { role: 'user', content: m }]);
    setBusy(true);
    try {
      const r = await api.post(`/advisory/${id}/message`, { message: m });
      setId(r.id);
      setMessages((x) => [...x, { role: 'assistant', content: r.reply, toolsUsed: r.toolsUsed }]);
      loadList();
    } catch (e) {
      setMessages((x) => [...x, { role: 'assistant', content: `⚠️ ${e.message}` }]);
    } finally { setBusy(false); }
  };

  return (
    <div className="chat-layout">
      <aside className="card sessions">
        <button onClick={() => open('new')}>+ New chat</button>
        {convs.map((c) => (
          <div key={c._id} className={`session ${c._id === id ? 'on' : ''}`} onClick={() => open(c._id)}>{c.title}</div>
        ))}
      </aside>
      <section className="card chat">
        <div className="messages">
          {!messages.length && (
            <div className="empty">
              <h3>Ask KisanMitra anything</h3>
              <p className="muted">The agent can look at your crops, prices and weather, and take actions for you.</p>
              <div className="chips">
                {SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role}`}>
              {m.content}
              {m.toolsUsed?.length > 0 && (
                <div className="tools">{[...new Set(m.toolsUsed)].map((t) => <span key={t}>{TOOL_LABEL[t] || t}</span>)}</div>
              )}
            </div>
          ))}
          {busy && <div className="bubble assistant muted">Thinking…</div>}
          <div ref={bottom} />
        </div>
        <form className="composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type in English, हिन्दी or any language…" />
          <button disabled={busy}>Send</button>
        </form>
      </section>
    </div>
  );
}
