import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import {
  getStoredToken,
  removeStoredToken,
  setStoredToken,
  syncTokenToServiceWorker
} from "../../lib/auth-storage";
import {
  getCurrentUser,
  googleLoginUser,
  loginUser,
  registerUser
} from "./auth.service";
import type {
  AuthUser,
  GoogleLoginInput,
  LoginInput,
  RegisterInput
} from "./auth.types";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  loginWithGoogle: (input: GoogleLoginInput) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateAuthUser: (input: Partial<AuthUser>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  async function refreshUser() {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  }

  function updateAuthUser(input: Partial<AuthUser>) {
    setUser((currentUser) => {
      if (!currentUser) {
        return currentUser;
      }

      return {
        ...currentUser,
        ...input
      };
    });
  }

  async function login(input: LoginInput) {
    const result = await loginUser(input);

    setStoredToken(result.token);
    setUser(result.user);
    syncTokenToServiceWorker(result.token);
  }

  async function register(input: RegisterInput) {
    const result = await registerUser(input);

    setStoredToken(result.token);
    setUser(result.user);
    syncTokenToServiceWorker(result.token);
  }

  async function loginWithGoogle(input: GoogleLoginInput) {
    const result = await googleLoginUser(input);

    setStoredToken(result.token);
    setUser(result.user);
    syncTokenToServiceWorker(result.token);
  }

  function logout() {
    removeStoredToken();
    setUser(null);
    syncTokenToServiceWorker(null);
  }

  useEffect(() => {
    const token = getStoredToken();
    syncTokenToServiceWorker(token);

    if (!token) {
      setIsInitializing(false);
      return;
    }

    getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
      })
      .catch(() => {
        removeStoredToken();
        setUser(null);
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isInitializing,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshUser,
        updateAuthUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }

  return context;
}