import { useEffect, useState } from 'react';
import { api } from '../api';

const empty = { name: '', areaAcres: '', soilType: 'loamy', season: 'rabi', sowingDate: '', expectedHarvest: '', expectedYieldQuintal: '' };
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '–');

export default function Crops() {
  const [crops, setCrops] = useState([]);
  const [form, setForm] = useState(empty);
  const [log, setLog] = useState({});
  const [err, setErr] = useState('');

  const load = () => api.get('/crops').then(setCrops).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const add = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await api.post('/crops', {
        ...form,
        areaAcres: Number(form.areaAcres),
        expectedYieldQuintal: Number(form.expectedYieldQuintal) || 0,
        expectedHarvest: form.expectedHarvest || undefined,
      });
      setForm(empty);
      load();
    } catch (e2) { setErr(e2.message); }
  };

  const addLog = async (id) => {
    const l = log[id];
    if (!l || !l.type) return;
    await api.post(`/crops/${id}/logs`, { type: l.type, note: l.note, cost: Number(l.cost) || 0 });
    setLog({ ...log, [id]: { type: 'water', note: '', cost: '' } });
    load();
  };

  const setStatus = async (id, status) => { await api.put(`/crops/${id}`, { status }); load(); };
  const remove = async (id) => { if (confirm('Delete this crop?')) { await api.del(`/crops/${id}`); load(); } };

  return (
    <>
      <h2>My crops</h2>
      <form className="card form-grid" onSubmit={add}>
        <input placeholder="Crop (e.g. Wheat)" value={form.name} onChange={set('name')} required />
        <input type="number" step="0.1" placeholder="Area (acres)" value={form.areaAcres} onChange={set('areaAcres')} required />
        <select value={form.soilType} onChange={set('soilType')}>
          {['alluvial', 'black', 'red', 'laterite', 'sandy', 'loamy', 'clay'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={form.season} onChange={set('season')}>
          {['kharif', 'rabi', 'zaid'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <label>Sowing date<input type="date" value={form.sowingDate} onChange={set('sowingDate')} required /></label>
        <label>Expected harvest<input type="date" value={form.expectedHarvest} onChange={set('expectedHarvest')} /></label>
        <input type="number" placeholder="Expected yield (quintal)" value={form.expectedYieldQuintal} onChange={set('expectedYieldQuintal')} />
        <button>Add crop</button>
      </form>
      {err && <div className="error">{err}</div>}

      <div className="grid two">
        {crops.map((c) => {
          const l = log[c._id] || { type: 'water', note: '', cost: '' };
          const spent = c.logs.reduce((s, x) => s + (x.cost || 0), 0);
          return (
            <div className="card" key={c._id}>
              <div className="between">
                <h3>{c.name} <span className={`badge ${c.status}`}>{c.status}</span></h3>
                <button className="ghost danger" onClick={() => remove(c._id)}>Delete</button>
              </div>
              <p className="muted">{c.areaAcres} acres · {c.soilType} soil · {c.season} · sown {fmt(c.sowingDate)} · harvest {fmt(c.expectedHarvest)}</p>
              <p>Spent so far: <b>₹{spent.toLocaleString('en-IN')}</b></p>
              <ul className="plain small">
                {c.logs.slice(-4).reverse().map((x) => (
                  <li key={x._id}>• {x.type}{x.note ? ` – ${x.note}` : ''} {x.cost ? `(₹${x.cost})` : ''} <span className="muted">{fmt(x.date)}</span></li>
                ))}
              </ul>
              <div className="row">
                <select value={l.type} onChange={(e) => setLog({ ...log, [c._id]: { ...l, type: e.target.value } })}>
                  {['water', 'fertilizer', 'pesticide', 'harvest', 'note'].map((t) => <option key={t}>{t}</option>)}
                </select>
                <input placeholder="Note" value={l.note} onChange={(e) => setLog({ ...log, [c._id]: { ...l, note: e.target.value } })} />
                <input type="number" placeholder="₹" style={{ maxWidth: 80 }} value={l.cost} onChange={(e) => setLog({ ...log, [c._id]: { ...l, cost: e.target.value } })} />
                <button onClick={() => addLog(c._id)}>Log</button>
              </div>
              {c.status === 'growing' && <button className="ghost" onClick={() => setStatus(c._id, 'harvested')}>Mark harvested</button>}
            </div>
          );
        })}
      </div>
      {!crops.length && <p className="muted">No crops yet. Add your first crop above.</p>}
    </>
  );
}
