
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { usePathname, useRouter } from 'next/navigation';
import { companyIdFromAuthEmail } from '@/lib/tenancy';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: User | null;
  role: string | null;
  assignedWarehouseId: string | null;
  companyId: string | null;
  subscriptionExpired: boolean;
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
  assignedWarehouseId: string | null;
  companyId: string | null;
  subscriptionExpired: boolean;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  role: string | null;
  assignedWarehouseId: string | null;
  companyId: string | null;
  subscriptionExpired: boolean;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface UserHookResult {
  user: User | null;
  role: string | null;
  assignedWarehouseId: string | null;
  companyId: string | null;
  subscriptionExpired: boolean;
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

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
    assignedWarehouseId: null,
    companyId: null,
    subscriptionExpired: false,
    isUserLoading: true,
    userError: null,
  });

  useEffect(() => {
    if (!auth) {
      setUserAuthState(prev => ({ ...prev, isUserLoading: false }));
      return;
    }

    let unsubscribeUser: (() => void) | undefined;
    let unsubscribeAdmin: (() => void) | undefined;
    let unsubscribeCompany: (() => void) | undefined;
    let companyExpiryTimeout: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        unsubscribeUser?.();
        unsubscribeAdmin?.();
        unsubscribeCompany?.();
        if (companyExpiryTimeout) clearTimeout(companyExpiryTimeout);
        unsubscribeUser = undefined;
        unsubscribeAdmin = undefined;
        unsubscribeCompany = undefined;
        if (firebaseUser) {
          const isPermanentAdmin = firebaseUser.email === PERMANENT_SUPER_ADMIN;
          const authenticatedCompanyId = isPermanentAdmin ? null : companyIdFromAuthEmail(firebaseUser.email);
          
          setUserAuthState({ 
            user: firebaseUser, 
            role: isPermanentAdmin ? "Super Admin" : "Omborchi", 
            assignedWarehouseId: null,
            companyId: authenticatedCompanyId,
            subscriptionExpired: !!authenticatedCompanyId,
            isUserLoading: false, 
            userError: null 
          });

          // Real-time role and warehouse syncing
          const userRef = authenticatedCompanyId
            ? doc(firestore, "companies", authenticatedCompanyId, "users", firebaseUser.uid)
            : doc(firestore, "users", firebaseUser.uid);
          const adminRef = doc(firestore, "rolesAdmin", firebaseUser.uid);

          unsubscribeUser = onSnapshot(userRef, (uDoc) => {
            if (!uDoc.exists()) return;
            const uData = uDoc.data();
            setUserAuthState(prev => ({
              ...prev,
              role: isPermanentAdmin ? "Super Admin" : (uData.role || "Omborchi"),
              assignedWarehouseId: uData.assignedWarehouseId || null,
              companyId: authenticatedCompanyId,
            }));
            const lastSeen = uData.lastSeenAt?.toDate?.();
            if (!lastSeen || Date.now() - lastSeen.getTime() > 24 * 60 * 60 * 1000) {
              updateDoc(userRef, { lastSeenAt: Timestamp.now() }).catch((error) => {
                console.error("Failed to update user activity timestamp:", error);
              });
            }

            if (authenticatedCompanyId) {
              setUserAuthState(prev => ({ ...prev, subscriptionExpired: true }));
              unsubscribeCompany?.();
              unsubscribeCompany = onSnapshot(
                doc(firestore, "companies", authenticatedCompanyId),
                (companySnapshot) => {
                  const companyData = companySnapshot.data();
                  const end = companyData?.subscriptionEndsAt?.toDate?.();
                  const expired = !companySnapshot.exists()
                    || companyData?.subscriptionStatus !== "active"
                    || !end
                    || end.getTime() <= Date.now();
                  if (companyExpiryTimeout) clearTimeout(companyExpiryTimeout);
                  if (!expired && end) {
                    companyExpiryTimeout = setTimeout(
                      () => setUserAuthState(prev => ({ ...prev, subscriptionExpired: true })),
                      end.getTime() - Date.now()
                    );
                  }
                  setUserAuthState(prev => ({ ...prev, subscriptionExpired: expired }));
                },
                (error) => {
                  setUserAuthState(prev => ({ ...prev, userError: error }));
                }
              );
            } else if (!authenticatedCompanyId && !unsubscribeAdmin) {
              unsubscribeAdmin = onSnapshot(adminRef, (aDoc) => {
                if (aDoc.exists()) setUserAuthState(prev => ({ ...prev, role: "Super Admin" }));
              });
            }
          }, (error) => {
            setUserAuthState(prev => ({
              ...prev,
              userError: error,
              subscriptionExpired: !!authenticatedCompanyId,
            }));
          });
        } else {
          setUserAuthState({ user: null, role: null, assignedWarehouseId: null, companyId: null, subscriptionExpired: false, isUserLoading: false, userError: null });
        }
      },
      (error) => {
        setUserAuthState({ user: null, role: null, assignedWarehouseId: null, companyId: null, subscriptionExpired: false, isUserLoading: false, userError: error });
      }
    );
    return () => {
      unsubscribe();
      unsubscribeUser?.();
      unsubscribeAdmin?.();
      unsubscribeCompany?.();
      if (companyExpiryTimeout) clearTimeout(companyExpiryTimeout);
    };
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
      assignedWarehouseId: userAuthState.assignedWarehouseId,
      companyId: userAuthState.companyId,
      subscriptionExpired: userAuthState.subscriptionExpired,
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
    assignedWarehouseId: context.assignedWarehouseId,
    companyId: context.companyId,
    subscriptionExpired: context.subscriptionExpired,
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
  const { user, role, assignedWarehouseId, companyId, subscriptionExpired, isUserLoading, userError } = useFirebase();
  return { user, role, assignedWarehouseId, companyId, subscriptionExpired, isUserLoading, userError };
};

export function SubscriptionGate({ children }: { children: ReactNode }) {
  const { user, companyId, subscriptionExpired, isUserLoading } = useFirebase();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user && companyId && subscriptionExpired && pathname !== "/subscription-required") {
      router.replace("/subscription-required");
    }
    if (!isUserLoading && user && companyId && !subscriptionExpired && pathname === "/subscription-required") {
      router.replace("/");
    }
  }, [companyId, isUserLoading, pathname, router, subscriptionExpired, user]);

  if (companyId && subscriptionExpired && pathname !== "/subscription-required") return null;
  return <>{children}</>;
}
