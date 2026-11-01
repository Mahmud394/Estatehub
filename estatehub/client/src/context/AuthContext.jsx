import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

// Holds the logged-in user for the whole app. The real login state lives in an
// HTTP-only cookie; this context only mirrors it so the UI can react.
// (Hiding buttons here is for convenience only - the backend enforces every permission.)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [brokerProfile, setBrokerProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const apply = (data) => {
    setUser(data?.user || null);
    setBrokerProfile(data?.brokerProfile || null);
  };

  const refresh = useCallback(async () => {
    try {
      apply(await api('/auth/me'));
    } catch {
      apply(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    await api('/auth/login', { method: 'POST', body: { email, password } });
    await refresh();
  };

  const register = async (form) => {
    await api('/auth/register', { method: 'POST', body: form });
    await refresh();
  };

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    apply(null);
  };

  return (
    <AuthContext.Provider value={{ user, brokerProfile, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
