'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: User | null;
  role: string | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  role: string | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  role: string | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface UserHookResult {
  user: User | null;
  role: string | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

// DOIMIY SUPER ADMIN EMAILI
const PERMANENT_SUPER_ADMIN = "f2472839@gmail.com";

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    role: null,
    isUserLoading: true,
    userError: null,
  });

  useEffect(() => {
    if (!auth) {
      setUserAuthState({ user: null, role: null, isUserLoading: false, userError: new Error("Auth service not provided.") });
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (firebaseUser) {
          try {
            // 1. Agar email PERMANENT_SUPER_ADMIN bo'lsa, hech qanday tekshiruvsiz Super Admin
            if (firebaseUser.email === PERMANENT_SUPER_ADMIN) {
              setUserAuthState({ 
                user: firebaseUser, 
                role: "Super Admin", 
                isUserLoading: false, 
                userError: null 
              });
              return;
            }

            // 2. Oddiy foydalanuvchilar uchun bazadan rolni o'qish
            let role = "Omborchi";
            const userDoc = await getDoc(doc(firestore, "users", firebaseUser.uid));
            if (userDoc.exists()) {
              role = userDoc.data().role;
            }
            
            // 3. rolesAdmin to'plamidan Super Adminlikni tekshirish (boshqalar uchun)
            const adminDoc = await getDoc(doc(firestore, "rolesAdmin", firebaseUser.uid));
            const isSuperAdmin = adminDoc.exists();
            
            setUserAuthState({ 
              user: firebaseUser, 
              role: isSuperAdmin ? "Super Admin" : role, 
              isUserLoading: false, 
              userError: null 
            });
          } catch (e) {
            // Xatolik bo'lsa ham emailni tekshirish (offline yoki baza xatosi bo'lsa)
            const isHardcodedAdmin = firebaseUser.email === PERMANENT_SUPER_ADMIN;
            setUserAuthState({ 
              user: firebaseUser, 
              role: isHardcodedAdmin ? "Super Admin" : "Omborchi", 
              isUserLoading: false, 
              userError: null 
            });
          }
        } else {
          setUserAuthState({ user: null, role: null, isUserLoading: false, userError: null });
        }
      },
      (error) => {
        setUserAuthState({ user: null, role: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe();
  }, [auth, firestore]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      role: userAuthState.role,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available.');
  }
  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    role: context.role,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

export const useAuth = (): Auth => useFirebase().auth;
export const useFirestore = (): Firestore => useFirebase().firestore;
export const useFirebaseApp = (): FirebaseApp => useFirebase().firebaseApp;

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T & {__memo?: boolean} {
  const memoized = useMemo(factory, deps);
  if(typeof memoized !== 'object' || memoized === null) return memoized as any;
  (memoized as any).__memo = true;
  return memoized as any;
}

export const useUser = (): UserHookResult => {
  const { user, role, isUserLoading, userError } = useFirebase();
  return { user, role, isUserLoading, userError };
};
