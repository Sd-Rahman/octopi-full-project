import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest, setOnUnauthorized } from '../api/client.js';

const AuthContext = createContext(null);

// Wraps the whole app. Keeps user+token in React state (source of
// truth for renders) but mirrors them to localStorage so a page
// refresh doesn't log the person out — we rehydrate from there on load.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  }, []);

  // Register the global 401 handler — if any API call gets a 401
  // (expired/invalid token), automatically log the user out so they're
  // redirected to login instead of staring at a broken page.
  useEffect(() => {
    setOnUnauthorized(logout);
    return () => setOnUnauthorized(null);
  }, [logout]);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setLoading(false);
      return;
    }
    // Don't just trust localStorage blindly — confirm the token is
    // still valid by asking the backend who it belongs to.
    apiRequest('/me', { token: storedToken })
      .then((data) => {
        setUser(data.user);
        setToken(storedToken);
      })
      .catch(() => {
        localStorage.removeItem('token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (userData, jwt) => {
    localStorage.setItem('token', jwt);
    setUser(userData);
    setToken(jwt);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

