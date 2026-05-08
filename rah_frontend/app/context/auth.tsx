import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api";
import { Storage } from "../utils/storage";

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  setUser: (user: any) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  setUser: () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load stored user on app start
    const loadUser = async () => {
      try {
        const token = await Storage.getToken();
        const cachedUser = await Storage.getUser();
        if (token && cachedUser) {
          setUser(cachedUser);
        }
      } catch (e) {
        console.warn("Failed to load cached user", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const signOut = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore server errors on logout
    }
    await Storage.clearAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        isLoading,
        user,
        setUser,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

