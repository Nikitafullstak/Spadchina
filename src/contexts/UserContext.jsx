import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api.js';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cultcode_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      api.me()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('cultcode_token');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    setError(null);
    try {
      const data = await api.login(email, password);
      localStorage.setItem('cultcode_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const register = async (name, email, password) => {
    setError(null);
    try {
      const data = await api.register(name, email, password);
      localStorage.setItem('cultcode_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('cultcode_token');
    setToken(null);
    setUser(null);
    setError(null);
  };

  const isAdmin = () => user?.role === 'admin';

  return (
    <UserContext.Provider
      value={{ user, token, loading, error, login, register, logout, isAdmin }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
