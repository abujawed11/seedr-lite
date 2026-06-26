import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getUserProfile, getQuotaInfo } from '../api';

// ==================== Types ====================

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  plan: string;
  storageUsed: number;
  storageQuota: number;
  remainingQuota?: number;
  isActive: boolean;
}

interface QuotaData {
  quota: string;
  used: string;
  reserved: string;
  inProgress: string;
  available: string;
  details: {
    quotaBytes: number;
    usedBytes: number;
    reservedBytes: number;
  };
}

interface StorageInfo {
  quota: string;
  used: string;
  reserved: string;
  inProgress: string;
  available: string;
  usedPercentage: number;
  details?: QuotaData['details'];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  detailedQuota: QuotaData | null;
  login: (username: string, password: string) => Promise<{ success: boolean; requiresOTP?: boolean; email?: string; error?: string }>;
  register: (username: string, email: string, password: string, ageConfirmed: boolean, termsAccepted: boolean, privacyAccepted: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setAuthData: (userData: User, authToken: string) => Promise<void>;
  getStorageInfo: () => StorageInfo | null;
  refreshUserProfile: () => Promise<User | null>;
  fetchDetailedQuota: () => Promise<QuotaData | null>;
}

// ==================== Context ====================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// ==================== Provider ====================

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailedQuota, setDetailedQuota] = useState<QuotaData | null>(null);

  // On app start — restore token from AsyncStorage and verify it
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('seedr_token');
        if (savedToken) {
          setToken(savedToken);
          const userData = await getUserProfile();
          setUser(userData.user);

          try {
            const quotaData = await getQuotaInfo();
            setDetailedQuota(quotaData);
          } catch {
            // quota fetch failing is non-fatal
          }
        }
      } catch {
        await AsyncStorage.removeItem('seedr_token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await apiLogin(username, password);

      if (response.requiresOTP) {
        return { success: false, requiresOTP: true, email: response.email };
      }

      const { token: newToken, user: userData } = response;
      await AsyncStorage.setItem('seedr_token', newToken);
      setToken(newToken);
      setUser(userData);

      try {
        const quotaData = await getQuotaInfo();
        setDetailedQuota(quotaData);
      } catch {
        // non-fatal
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.detail || error.message || 'Login failed',
      };
    }
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    ageConfirmed: boolean,
    termsAccepted: boolean,
    privacyAccepted: boolean
  ) => {
    try {
      await apiRegister(username, email, password, ageConfirmed, termsAccepted, privacyAccepted);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed',
      };
    }
  };

  const logout = async () => {
    try {
      if (token) await apiLogout();
    } catch {
      // non-fatal
    } finally {
      await AsyncStorage.removeItem('seedr_token');
      setToken(null);
      setUser(null);
      setDetailedQuota(null);
    }
  };

  // Used after OTP verification to directly set auth state
  const setAuthData = async (userData: User, authToken: string) => {
    await AsyncStorage.setItem('seedr_token', authToken);
    setToken(authToken);
    setUser(userData);

    try {
      const quotaData = await getQuotaInfo();
      setDetailedQuota(quotaData);
    } catch {
      // non-fatal
    }
  };

  const refreshUserProfile = async (): Promise<User | null> => {
    if (!token) return null;
    try {
      const userData = await getUserProfile();
      setUser(userData.user);
      return userData.user;
    } catch {
      return null;
    }
  };

  const fetchDetailedQuota = async (): Promise<QuotaData | null> => {
    if (!token) return null;
    try {
      const quotaData = await getQuotaInfo();
      setDetailedQuota(quotaData);
      return quotaData;
    } catch {
      return null;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStorageInfo = (): StorageInfo | null => {
    if (!user) return null;

    if (detailedQuota) {
      const usedPercentage =
        detailedQuota.details.quotaBytes > 0
          ? (detailedQuota.details.usedBytes / detailedQuota.details.quotaBytes) * 100
          : 0;

      return {
        quota: detailedQuota.quota,
        used: detailedQuota.used,
        reserved: detailedQuota.reserved,
        inProgress: detailedQuota.inProgress || '0 B',
        available: detailedQuota.available,
        usedPercentage: Math.round(usedPercentage),
        details: detailedQuota.details,
      };
    }

    const used = user.storageUsed || 0;
    const quota = user.storageQuota || 0;
    const available = user.remainingQuota !== undefined ? user.remainingQuota : quota - used;
    const usedPercentage = quota > 0 ? (used / quota) * 100 : 0;

    return {
      used: formatBytes(used),
      quota: formatBytes(quota),
      available: formatBytes(available),
      reserved: '0 B',
      inProgress: '0 B',
      usedPercentage: Math.round(usedPercentage),
    };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        detailedQuota,
        login,
        register,
        logout,
        setAuthData,
        getStorageInfo,
        refreshUserProfile,
        fetchDetailedQuota,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
