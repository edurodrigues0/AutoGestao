import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import axios from "axios";

const THEME_STORAGE_KEY = "autogestao-theme";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
axios.defaults.withCredentials = true;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { setTheme } = useTheme();
  const [user, setUser] = useState(null); // null=loading, false=not authed, obj=authed
  const [loading, setLoading] = useState(true);

  const login = async (email, password) => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
    setUser(data);
    return data;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch { }
    try {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } catch { }
    setTheme("light");
    setUser(false);
  };

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(data);
    } catch {
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUser = async () => {
    await checkAuth();
  };

  useEffect(function checkAuthOnMount() {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export { API };
