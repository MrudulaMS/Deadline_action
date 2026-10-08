import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, UserSettings } from '../types';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  dailyWorkloadThreshold: 8,
  weeklyWorkloadThreshold: 18,
  preferredWorkStartTime: '09:00',
  preferredWorkEndTime: '18:00',
  weekStartsOn: 'Monday',
  defaultCalendarView: 'month',
  deadlineRemindersEnabled: true,
  workloadWarningsEnabled: true,
  dailySummaryEnabled: false,
  theme: 'light',
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  settings: UserSettings;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, displayName?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePreferences: (newSettings: Partial<UserSettings>) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize or fetch user profile & settings
  const syncUserData = async (currentUser: User) => {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);

      const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';

      if (!userSnap.exists()) {
        const newProfile: UserProfile = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Student',
          timezone: detectedTz,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(userRef, newProfile);
        setProfile(newProfile);

        // Also create default preferences
        const settingsRef = doc(db, 'users', currentUser.uid, 'settings', 'preferences');
        await setDoc(settingsRef, DEFAULT_USER_SETTINGS);
        setSettings(DEFAULT_USER_SETTINGS);
      } else {
        const data = userSnap.data();
        setProfile({
          uid: currentUser.uid,
          email: data.email || currentUser.email || '',
          displayName: data.displayName || 'Student',
          timezone: data.timezone || detectedTz,
        });

        // Fetch settings
        const settingsRef = doc(db, 'users', currentUser.uid, 'settings', 'preferences');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          setSettings({ ...DEFAULT_USER_SETTINGS, ...settingsSnap.data() });
        } else {
          await setDoc(settingsRef, DEFAULT_USER_SETTINGS);
          setSettings(DEFAULT_USER_SETTINGS);
        }
      }
    } catch (err) {
      console.error('Error syncing user data:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncUserData(currentUser);
      } else {
        setProfile(null);
        setSettings(DEFAULT_USER_SETTINGS);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      const msg = err.code ? err.code.replace('auth/', '').replace(/-/g, ' ') : err.message;
      setError(`Login failed: ${msg}`);
      throw err;
    }
  };

  const register = async (email: string, pass: string, displayName?: string) => {
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
      const userRef = doc(db, 'users', cred.user.uid);
      const newProfile: UserProfile = {
        uid: cred.user.uid,
        email,
        displayName: displayName || email.split('@')[0],
        timezone: detectedTz,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, newProfile);
      setProfile(newProfile);

      const settingsRef = doc(db, 'users', cred.user.uid, 'settings', 'preferences');
      await setDoc(settingsRef, DEFAULT_USER_SETTINGS);
      setSettings(DEFAULT_USER_SETTINGS);
    } catch (err: any) {
      const msg = err.code ? err.code.replace('auth/', '').replace(/-/g, ' ') : err.message;
      setError(`Registration failed: ${msg}`);
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      const msg = err.code ? err.code.replace('auth/', '').replace(/-/g, ' ') : err.message;
      setError(`Google Sign-In failed: ${msg}`);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      const msg = err.code ? err.code.replace('auth/', '').replace(/-/g, ' ') : err.message;
      setError(`Password reset error: ${msg}`);
      throw err;
    }
  };

  const updatePreferences = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;
    try {
      const updated = { ...settings, ...newSettings };
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
      await setDoc(settingsRef, updated, { merge: true });
      setSettings(updated);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/settings/preferences`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        settings,
        loading,
        error,
        login,
        register,
        loginWithGoogle,
        logout,
        resetPassword,
        updatePreferences,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
