import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Login() {
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', village: '', district: '', state: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <form className="card auth-card" onSubmit={submit}>
        <h1>🌾 KisanMitra</h1>
        <p className="muted">AI farm advisor, crop tracker and mandi price alerts in one place.</p>
        {mode === 'register' && (
          <>
            <input placeholder="Full name" value={form.name} onChange={set('name')} required />
            <div className="row">
              <input placeholder="Village" value={form.village} onChange={set('village')} />
              <input placeholder="District" value={form.district} onChange={set('district')} />
            </div>
            <input placeholder="State" value={form.state} onChange={set('state')} />
          </>
        )}
        <input type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
        <input type="password" placeholder="Password (min 6)" value={form.password} onChange={set('password')} required minLength={6} />
        {error && <div className="error">{error}</div>}
        <button disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}</button>
        <p className="muted small">
          {mode === 'login' ? 'New here?' : 'Already registered?'}{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'register' : 'login'); }}>
            {mode === 'login' ? 'Create an account' : 'Login'}
          </a>
        </p>
        {mode === 'login' && (
          <button type="button" className="ghost" onClick={() => setForm({ ...form, email: 'demo@kisanmitra.in', password: 'demo1234' })}>
            Fill demo credentials
          </button>
        )}
      </form>
    </div>
  );
}
