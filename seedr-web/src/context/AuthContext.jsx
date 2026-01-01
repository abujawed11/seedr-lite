import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getUserProfile, getQuotaInfo } from '../api';

const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('seedr_token'));
  const [detailedQuota, setDetailedQuota] = useState(null);

  // Check if user is authenticated on app start
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const userData = await getUserProfile();
          setUser(userData.user);

          // Immediately fetch detailed quota after setting user
          try {
            const quotaData = await getQuotaInfo();
            setDetailedQuota(quotaData);
          } catch (quotaError) {
            console.error('Failed to fetch detailed quota on auth:', quotaError);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('seedr_token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  // Periodically refresh detailed quota to keep it up to date
  useEffect(() => {
    if (!token || !user) return;

    const interval = setInterval(() => {
      fetchDetailedQuota();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [token, user]);

  const login = async (username, password) => {
    try {
      const response = await apiLogin(username, password);

      // Check if admin OTP is required
      if (response.requiresOTP) {
        return {
          success: false,
          requiresOTP: true,
          email: response.email,
          message: response.message
        };
      }

      const { token: newToken, user: userData } = response;

      localStorage.setItem('seedr_token', newToken);
      setToken(newToken);
      setUser(userData);

      // Fetch detailed quota immediately after login
      try {
        const quotaData = await getQuotaInfo();
        setDetailedQuota(quotaData);
      } catch (quotaError) {
        console.error('Failed to fetch detailed quota after login:', quotaError);
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await apiRegister(username, email, password);

      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed'
      };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await apiLogout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('seedr_token');
      setToken(null);
      setUser(null);
    }
  };

  // Direct login with token and user data (for OTP verification)
  const setAuthData = async (userData, authToken) => {
    localStorage.setItem('seedr_token', authToken);
    setToken(authToken);
    setUser(userData);

    // Fetch detailed quota immediately
    try {
      const quotaData = await getQuotaInfo();
      setDetailedQuota(quotaData);
    } catch (quotaError) {
      console.error('Failed to fetch detailed quota:', quotaError);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const refreshUserProfile = async () => {
    if (!token) return;

    try {
      console.log('🔄 Refreshing user profile data...');
      const userData = await getUserProfile();
      setUser(userData.user);
      console.log('✅ User profile refreshed');
      return userData.user;
    } catch (error) {
      console.error('❌ Failed to refresh user profile:', error);
      return null;
    }
  };

  const fetchDetailedQuota = async () => {
    if (!token) return;

    try {
      const quotaData = await getQuotaInfo();
      setDetailedQuota(quotaData);
      return quotaData;
    } catch (error) {
      console.error('❌ Failed to fetch detailed quota:', error);
      return null;
    }
  };

  const getStorageInfo = () => {
    if (!user) return null;

    // Use detailed quota info if available, otherwise fallback to user data
    if (detailedQuota) {
      const usedPercentage = detailedQuota.details.quotaBytes > 0
        ? (detailedQuota.details.usedBytes / detailedQuota.details.quotaBytes) * 100
        : 0;

      return {
        quota: detailedQuota.quota,
        used: detailedQuota.used,
        reserved: detailedQuota.reserved,
        inProgress: detailedQuota.inProgress || '0 B',
        available: detailedQuota.available,
        usedPercentage: Math.round(usedPercentage),
        details: detailedQuota.details
      };
    }

    // Fallback to basic user data - try to use remainingQuota if available
    const used = user.storageUsed || 0;
    const quota = user.storageQuota || 0;

    // Use remainingQuota if available (this should account for reservations)
    const available = user.remainingQuota !== undefined ? user.remainingQuota : (quota - used);
    const usedPercentage = quota > 0 ? (used / quota) * 100 : 0;


    return {
      used: formatBytes(used),
      quota: formatBytes(quota),
      available: formatBytes(available),
      reserved: '0 B',
      inProgress: '0 B',
      usedPercentage: Math.round(usedPercentage)
    };
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    setAuthData,
    isAuthenticated: !!user,
    getStorageInfo,
    refreshUserProfile,
    fetchDetailedQuota,
    detailedQuota
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { useAuth, AuthProvider };