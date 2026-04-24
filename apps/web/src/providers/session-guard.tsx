'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { AUTH_QUERY_KEY } from '@/hooks/use-auth';
import { onSessionExpired } from '@/lib/http';

export function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  useEffect(() => {
    return onSessionExpired(() => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
      toast.error('Sua sessão expirou. Entre novamente para continuar.');
      const from = pathname && pathname !== '/login' ? `?from=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${from}`);
    });
  }, [router, pathname, queryClient]);

  return null;
}
