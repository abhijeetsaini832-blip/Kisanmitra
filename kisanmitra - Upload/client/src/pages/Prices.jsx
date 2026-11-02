import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api';

const ARROW = { rising: '▲', falling: '▼', stable: '■' };

export default function Prices() {
  const [prices, setPrices] = useState([]);
  const [sel, setSel] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [form, setForm] = useState({ commodity: '', condition: 'above', targetPrice: '' });

  const loadAlerts = () => api.get('/prices/alerts/mine').then(setAlerts);
  useEffect(() => {
    api.get('/prices').then((p) => { setPrices(p); setSel(p[0] || null); setForm((f) => ({ ...f, commodity: p[0]?.commodity || '' })); });
    loadAlerts();
  }, []);

  const addAlert = async (e) => {
    e.preventDefault();
    await api.post('/prices/alerts', { ...form, targetPrice: Number(form.targetPrice) });
    setForm({ ...form, targetPrice: '' });
    loadAlerts();
  };

  return (
    <>
      <h2>Mandi prices</h2>
      <div className="grid prices">
        {prices.map((p) => (
          <div key={p.commodity} className={`card price ${sel?.commodity === p.commodity ? 'on' : ''}`} onClick={() => setSel(p)}>
            <div className="between"><b>{p.commodity}</b><span className={`trend ${p.trend}`}>{ARROW[p.trend]} {p.weekChangePct}%</span></div>
            <strong>₹{p.latestPrice.toLocaleString('en-IN')}</strong>
            <span className="muted small">per quintal · {p.market}</span>
          </div>
        ))}
      </div>

      {sel && (
        <div className="card">
          <h3>{sel.commodity} – recent trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={sel.history}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip formatter={(v) => `₹${v}`} />
              <Line type="monotone" dataKey="price" stroke="#1f6f43" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <h3>Price alerts</h3>
        <form className="row" onSubmit={addAlert}>
          <select value={form.commodity} onChange={(e) => setForm({ ...form, commodity: e.target.value })}>
            {prices.map((p) => <option key={p.commodity}>{p.commodity}</option>)}
          </select>
          <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
            <option value="above">goes above</option>
            <option value="below">falls below</option>
          </select>
          <input type="number" placeholder="₹ per quintal" value={form.targetPrice} onChange={(e) => setForm({ ...form, targetPrice: e.target.value })} required />
          <button>Add alert</button>
        </form>
        <ul className="plain">
          {alerts.map((a) => (
            <li key={a._id} className="between">
              <span>
                {a.triggered ? '🔔' : '⏳'} {a.commodity} {a.condition} ₹{a.targetPrice} <span className="muted">(now ₹{a.currentPrice ?? '–'})</span>
                {a.triggered && <b className="hit"> – target reached!</b>}
              </span>
              <button className="ghost danger" onClick={async () => { await api.del(`/prices/alerts/${a._id}`); loadAlerts(); }}>Remove</button>
            </li>
          ))}
        </ul>
        {!alerts.length && <p className="muted">No alerts yet.</p>}
      </div>
    </>
  );
}
