import { createContext, useContext, useState, type ReactNode } from "react";

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
  return (
    <AuthContext.Provider
      value={{
        isAuditor,
        toggleLogin: () => setIsAuditor((v) => !v),
        logout: () => setIsAuditor(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
