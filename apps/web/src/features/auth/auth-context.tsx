import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import {
  getStoredToken,
  hasStoredToken,
  removeStoredToken,
  setStoredToken,
  syncTokenToServiceWorker,
  getCachedUser,
  setCachedUser,
  removeCachedUser
} from "../../lib/auth-storage";
import { getTransactions } from "../transactions/transaction.service";
import { isDailyReviewCompletedToday } from "../../lib/daily-review";
import { 
  getTransactionReminderSettings, 
  syncLocalHabitReminder, 
  isNativePlatform 
} from "../../lib/transaction-reminder";
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
    setCachedUser(result.user);
    syncTokenToServiceWorker(result.token);
  }

  async function register(input: RegisterInput) {
    const result = await registerUser(input);

    setStoredToken(result.token);
    setUser(result.user);
    setCachedUser(result.user);
    syncTokenToServiceWorker(result.token);
  }

  async function loginWithGoogle(input: GoogleLoginInput) {
    const result = await googleLoginUser(input);

    setStoredToken(result.token);
    setUser(result.user);
    setCachedUser(result.user);
    syncTokenToServiceWorker(result.token);
  }

  function logout() {
    GoogleAuth.signOut().catch((err) => console.error("Google signOut error:", err));
    removeStoredToken();
    removeCachedUser();
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

    const cachedUser = getCachedUser();
    if (cachedUser) {
      setUser(cachedUser);
      setIsInitializing(false);
    }

    getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        setCachedUser(currentUser);
      })
      .catch((error) => {
        // Jangan hapus token jika terjadi error koneksi.
        // Penghapusan token saat kadaluwarsa (401) sudah ditangani di api-client.
        if (!cachedUser) {
          setUser(null);
        }
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, []);

  useEffect(() => {
    function handleSessionExpired() {
      setUser(null);
      setIsInitializing(false);
    }

    window.addEventListener("sakuin:session-expired", handleSessionExpired);

    return () => {
      window.removeEventListener(
        "sakuin:session-expired",
        handleSessionExpired
      );
    };
  }, []);

  useEffect(() => {
    if (!user || !isNativePlatform()) return;

    async function evaluateHabitReminder() {
      try {
        const settings = getTransactionReminderSettings(user!.id);
        if (!settings.enabled) {
          await syncLocalHabitReminder(false, settings);
          return;
        }

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
        
        const response = await getTransactions({ startDate: startOfDay, endDate: endOfDay, limit: 1 });
        const hasTransactionsToday =
          response.items.length > 0 || isDailyReviewCompletedToday(user!.id);
        
        await syncLocalHabitReminder(hasTransactionsToday, settings);
      } catch (error) {
        console.error("Failed to evaluate habit reminder", error);
      }
    }

    evaluateHabitReminder();

    const handleTransactionAdded = () => {
      evaluateHabitReminder();
    };

    window.addEventListener("sakuin:transaction-added", handleTransactionAdded);
    window.addEventListener("sakuin:transaction-reminder-settings", handleTransactionAdded);
    window.addEventListener("sakuin:daily-review-completed", handleTransactionAdded);

    return () => {
      window.removeEventListener("sakuin:transaction-added", handleTransactionAdded);
      window.removeEventListener("sakuin:transaction-reminder-settings", handleTransactionAdded);
      window.removeEventListener("sakuin:daily-review-completed", handleTransactionAdded);
    };
  }, [user]);

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
