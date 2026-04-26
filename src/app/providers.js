'use client';

import { AuthProvider } from '@/lib/auth';
import { StoreProvider } from '@/store/StoreContext';

export function Providers({ children }) {
  return (
    <AuthProvider>
      <StoreProvider>
        {children}
      </StoreProvider>
    </AuthProvider>
  );
}
