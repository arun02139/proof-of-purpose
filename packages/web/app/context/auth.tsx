import { createContext, useContext, useState, type ReactNode } from "react";

interface AuthState {
  isAuditor: boolean;
  toggleLogin: () => void;
}

const AuthContext = createContext<AuthState>({
  isAuditor: false,
  toggleLogin: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuditor, setIsAuditor] = useState(false);
  return (
    <AuthContext.Provider
      value={{ isAuditor, toggleLogin: () => setIsAuditor((v) => !v) }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
