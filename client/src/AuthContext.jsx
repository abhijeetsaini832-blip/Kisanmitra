import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('km_token')));

  useEffect(() => {
    if (!localStorage.getItem('km_token')) return;
    api.get('/auth/me').then((d) => setUser(d.user)).catch(() => localStorage.removeItem('km_token')).finally(() => setLoading(false));
  }, []);

  const authenticate = async (path, payload) => {
    const d = await api.post(path, payload);
    localStorage.setItem('km_token', d.token);
    setUser(d.user);
  };

  const value = {
    user,
    setUser,
    loading,
    login: (email, password) => authenticate('/auth/login', { email, password }),
    register: (payload) => authenticate('/auth/register', payload),
    logout: () => { localStorage.removeItem('km_token'); setUser(null); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
