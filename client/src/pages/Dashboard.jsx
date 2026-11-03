import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api';

const COLORS = ['#1f6f43', '#e0a526', '#3a7ca5', '#c0563b', '#7a6bb0'];
const inr = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN');

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => { api.get('/dashboard').then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <div className="error">{err}</div>;
  if (!d) return <div className="center">Loading…</div>;

  const stats = [
    ['Crops growing', `${d.growingCount} / ${d.cropCount}`],
    ['Total land', `${d.totalAcres} acres`],
    ['Money spent', inr(d.totalCost)],
    ['Projected revenue', inr(d.projectedRevenue)],
    ['Projected profit', inr(d.projectedProfit)],
    ['Active alerts', d.activeAlerts],
  ];

  return (
    <>
      <h2>Your farm at a glance</h2>
      <div className="grid stats">
        {stats.map(([k, v]) => (
          <div className="card stat" key={k}><span className="muted">{k}</span><strong>{v}</strong></div>
        ))}
      </div>

      <div className="grid two">
        <div className="card">
          <h3>Projected revenue by crop</h3>
          {d.perCrop.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={d.perCrop}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(v) => inr(v)} />
                <Bar dataKey="revenue" fill="#1f6f43" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="muted">Add crops with expected yield to see projections.</p>}
        </div>
        <div className="card">
          <h3>Spending by activity</h3>
          {d.costByType.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={d.costByType} dataKey="value" nameKey="type" outerRadius={90} label>
                  {d.costByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => inr(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="muted">Log costs on your crops to see the breakdown.</p>}
        </div>
      </div>

      <div className="card">
        <h3>Upcoming harvests</h3>
        {d.upcomingHarvests.length ? (
          <ul className="plain">
            {d.upcomingHarvests.map((h) => (
              <li key={h.name}>🌱 <b>{h.name}</b> – {new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</li>
            ))}
          </ul>
        ) : <p className="muted">No harvest dates set yet.</p>}
        <Link to="/advisor"><button>Ask the AI advisor →</button></Link>
      </div>
    </>
  );
}
