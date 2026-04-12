import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface AuthState {
  isAuditor: boolean;
  toggleLogin: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  isAuditor: false,
  toggleLogin: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuditor, setIsAuditor] = useState(false);
  const toggleLogin = useCallback(() => setIsAuditor((v) => !v), []);
  const logout = useCallback(() => setIsAuditor(false), []);
  const value = useMemo(() => ({ isAuditor, toggleLogin, logout }), [isAuditor, toggleLogin, logout]);
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
