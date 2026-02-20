
'use client';

import React, { useMemo, useEffect, useState, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => initializeFirebase(), []);
  const pathname = usePathname();
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const { auth } = firebaseServices;
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsInitialized(true);
      if (!user && pathname !== '/login') {
        router.push('/login');
      }
      if (user && pathname === '/login') {
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [firebaseServices, pathname, router]);

  // Prevent SSR flickering and ensure auth is checked before rendering children on specific routes
  if (!isInitialized && pathname !== '/login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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
