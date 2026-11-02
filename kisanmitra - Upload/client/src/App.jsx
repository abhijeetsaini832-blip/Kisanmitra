import { useRef } from 'react';
import { api } from './api';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Crops from './pages/Crops.jsx';
import Advisor from './pages/Advisor.jsx';
import Prices from './pages/Prices.jsx';

function Avatar() {
  const { user, setUser } = useAuth();
  const input = useRef(null);

  const pick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = async () => {
      const size = 160;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const s = Math.min(img.width, img.height);
      canvas.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      const d = await api.put('/auth/me', { photo: canvas.toDataURL('image/jpeg', 0.8) });
      setUser(d.user);
    };
    img.src = URL.createObjectURL(file);
  };

  return (
    <>
      <button className="avatar" title="Change photo" onClick={() => input.current.click()}>
        {user.photo ? <img src={user.photo} alt="" /> : user.name.charAt(0).toUpperCase()}
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={pick} />
    </>
  );
}

function Layout({ children }) {
  const { user, logout } = useAuth();
  const link = ({ isActive }) => (isActive ? 'active' : '');
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">🌾 KisanMitra</div>
        <nav>
          <NavLink to="/" end className={link}>Dashboard</NavLink>
          <NavLink to="/crops" className={link}>Crops</NavLink>
          <NavLink to="/advisor" className={link}>AI Advisor</NavLink>
          <NavLink to="/prices" className={link}>Prices</NavLink>
        </nav>
        <div className="who">
          <Avatar />
          <span>{user.name}</span>
          <button className="ghost" onClick={logout}>Logout</button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Private><Dashboard /></Private>} />
      <Route path="/crops" element={<Private><Crops /></Private>} />
      <Route path="/advisor" element={<Private><Advisor /></Private>} />
      <Route path="/prices" element={<Private><Prices /></Private>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
