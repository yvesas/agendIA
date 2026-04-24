'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

import { useLogout } from '@/hooks/use-logout';
import { onSessionExpired } from '@/lib/http';

export function SessionGuard() {
  const { logoutSilent } = useLogout();

  useEffect(() => {
    return onSessionExpired(() => {
      toast.error('Sua sessão expirou. Entre novamente para continuar.');
      logoutSilent();
    });
  }, [logoutSilent]);

  return null;
}
