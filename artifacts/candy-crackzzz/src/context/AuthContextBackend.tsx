import React, { createContext, useContext, useEffect, ReactNode, useState } from 'react';
import { AdminActivityEntry, AdminRole } from '../types';
import {
  PublicAdminUser,
  apiChangeCredentials,
  apiCreateEmployee,
  apiGetBootstrap,
  apiLogin,
  apiLogout,
  apiSetEmployeeAccess,
  apiSetupAdmin,
  authHasRole,
} from '../lib/api';

interface AuthContextType {
  isLoaded: boolean;
  isAdminSetup: boolean;
  isLoggedIn: boolean;
  loginError: string;
  currentUser: PublicAdminUser | null;
  isOwner: boolean;
  staffUsers: PublicAdminUser[];
  activityLogs: AdminActivityEntry[];
  setupAdmin: (username: string, password: string) => Promise<boolean>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  changeCredentials: (currentPassword: string, newUsername: string, newPassword: string) => Promise<{ success: boolean; error: string }>;
  createEmployeeInvite: (username: string, password: string) => Promise<{ success: boolean; error: string; invite?: { username: string; password: string } }>;
  setEmployeeAccess: (userId: string, enabled: boolean) => Promise<{ success: boolean; error: string }>;
  hasRole: (roles?: AdminRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAdminSetup, setIsAdminSetup] = useState(false);
  const [currentUser, setCurrentUser] = useState<PublicAdminUser | null>(null);
  const [staffUsers, setStaffUsers] = useState<PublicAdminUser[]>([]);
  const [activityLogs, setActivityLogs] = useState<AdminActivityEntry[]>([]);
  const [loginError, setLoginError] = useState('');

  const applyAuthSnapshot = (snapshot: {
    isAdminSetup: boolean;
    currentUser: PublicAdminUser | null;
    staffUsers: PublicAdminUser[];
    activityLogs: AdminActivityEntry[];
  }) => {
    setIsAdminSetup(snapshot.isAdminSetup);
    setCurrentUser(snapshot.currentUser);
    setStaffUsers(snapshot.staffUsers ?? []);
    setActivityLogs(snapshot.activityLogs ?? []);
  };

  useEffect(() => {
    let isMounted = true;

    const loadAuth = async () => {
      try {
        const bootstrap = await apiGetBootstrap();
        if (!isMounted) return;
        applyAuthSnapshot(bootstrap.auth);
      } catch (error) {
        console.error('Failed to load auth state from backend.', error);
        if (!isMounted) return;
        applyAuthSnapshot({
          isAdminSetup: false,
          currentUser: null,
          staffUsers: [],
          activityLogs: [],
        });
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    };

    void loadAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const setupAdmin = async (username: string, password: string) => {
    try {
      const response = await apiSetupAdmin(username, password);
      applyAuthSnapshot(response.auth);
      setLoginError('');
      return true;
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Could not create the admin account.');
      return false;
    }
  };

  const login = async (username: string, password: string) => {
    setLoginError('');
    try {
      const response = await apiLogin(username, password);
      applyAuthSnapshot(response.auth);
      return true;
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Invalid username or password.');
      return false;
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error('Failed to log out cleanly.', error);
    } finally {
      setCurrentUser(null);
    }
  };

  const changeCredentials = async (currentPassword: string, newUsername: string, newPassword: string) => {
    try {
      const response = await apiChangeCredentials(currentPassword, newUsername, newPassword);
      applyAuthSnapshot(response.auth);
      return { success: true, error: '' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Could not update credentials.' };
    }
  };

  const createEmployeeInvite = async (username: string, password: string) => {
    try {
      const response = await apiCreateEmployee(username, password);
      applyAuthSnapshot(response.auth);
      return { success: true, error: '', invite: response.invite };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Could not create the employee login.' };
    }
  };

  const setEmployeeAccess = async (userId: string, enabled: boolean) => {
    try {
      const response = await apiSetEmployeeAccess(userId, enabled);
      applyAuthSnapshot(response.auth);
      return { success: true, error: '' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Could not update employee access.' };
    }
  };

  const isLoggedIn = !!currentUser;
  const isOwner = currentUser?.role === 'owner';
  const hasRole = (roles?: AdminRole[]) => authHasRole(currentUser, roles);

  return (
    <AuthContext.Provider value={{
      isLoaded,
      isAdminSetup,
      isLoggedIn,
      loginError,
      currentUser,
      isOwner,
      staffUsers,
      activityLogs,
      setupAdmin,
      login,
      logout,
      changeCredentials,
      createEmployeeInvite,
      setEmployeeAccess,
      hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
