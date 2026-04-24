'use client';

import { type ReactNode } from 'react';
import { Toaster } from 'sonner';

import { QueryProvider } from './query-provider';
import { SessionGuard } from './session-guard';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <SessionGuard />
      {children}
      <Toaster position="top-right" richColors closeButton />
    </QueryProvider>
  );
}
