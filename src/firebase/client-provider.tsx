
'use client';

import React, { useMemo, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []);

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const { auth } = firebaseServices;
    
    // Auth state listener to handle redirects
    const unsubscribe = auth.onAuthStateChanged((user) => {
      // If no user and not on login page, redirect to login
      if (!user && pathname !== '/login') {
        router.push('/login');
      }
      // If user is logged in and on login page, redirect to home
      if (user && pathname === '/login') {
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [firebaseServices, pathname, router]);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
