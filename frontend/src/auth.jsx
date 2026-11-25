import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';
const Context = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [timezone, setTimezone] = useState('Asia/Karachi');
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState('');
  useEffect(() => {
    let live = true;
    const expire = () => {
      sessionStorage.removeItem('clinic_token');
      setUser(null);
      setSessionError('Your session has expired. Please sign in again.');
    };
    window.addEventListener('clinic:expired', expire);
    if (sessionStorage.getItem('clinic_token')) {
      api('/auth/me')
        .then((data) => {
          if (live) {
            setUser(data.user);
            setTimezone(data.timezone);
          }
        })
        .catch((error) => {
          if (live) {
            sessionStorage.removeItem('clinic_token');
            setSessionError(error.message);
          }
        })
        .finally(() => {
          if (live) setChecking(false);
        });
    } else setChecking(false);
    return () => {
      live = false;
      window.removeEventListener('clinic:expired', expire);
    };
  }, []);
  async function login(email, password) {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    sessionStorage.setItem('clinic_token', data.token);
    setUser(data.user);
    setTimezone(data.timezone);
    setSessionError('');
  }
  function logout() {
    sessionStorage.removeItem('clinic_token');
    setUser(null);
    setSessionError('');
  }
  return (
    <Context.Provider value={{ user, timezone, checking, login, logout, sessionError }}>
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
