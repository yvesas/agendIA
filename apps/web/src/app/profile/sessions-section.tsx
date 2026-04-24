'use client';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { type SessionSummary, useRevokeSession, useSessions } from '@/hooks/use-profile';
import { ApiError } from '@/lib/http';
import { formatDateTime } from '@/lib/utils/format';

import { SectionCard } from './section-card';

export function SessionsSection() {
  const { data, isLoading, isError, refetch } = useSessions();
  const revoke = useRevokeSession();

  async function onRevoke(id: string) {
    try {
      await revoke.mutateAsync(id);
      toast.success('Sessão encerrada.');
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        return;
      }
      const message =
        error instanceof ApiError ? error.displayMessage : 'Falha ao encerrar sessão.';
      toast.error(message);
    }
  }

  return (
    <SectionCard
      title="Sessões ativas"
      description="Dispositivos com refresh token válido. Encerrar uma sessão revoga o token — o dispositivo precisará entrar de novo."
    >
      {isLoading && !data ? (
        <SessionsSkeleton />
      ) : isError ? (
        <SessionsError onRetry={() => void refetch()} />
      ) : data && data.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma sessão ativa.</p>
      ) : data ? (
        <ul className="space-y-3">
          {data.map((session) => (
            <li key={session.id}>
              <SessionCard
                session={session}
                onRevoke={() => onRevoke(session.id)}
                isRevoking={revoke.isPending && revoke.variables === session.id}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </SectionCard>
  );
}

interface SessionCardProps {
  session: SessionSummary;
  onRevoke: () => void;
  isRevoking: boolean;
}

function SessionCard({ session, onRevoke, isRevoking }: SessionCardProps) {
  return (
    <article className="border-border bg-background flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1 text-sm">
        <p className="text-foreground font-medium">{describeUserAgent(session.userAgent)}</p>
        <p className="text-muted-foreground text-xs">
          {session.ip ? `IP ${session.ip}` : 'IP desconhecido'} · criada{' '}
          {formatDateTime(session.createdAt)}
          {session.lastUsedAt ? ` · último uso ${formatDateTime(session.lastUsedAt)}` : ''}
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onRevoke}
        loading={isRevoking}
        disabled={isRevoking}
        className="shrink-0 whitespace-nowrap"
      >
        {isRevoking ? 'Encerrando...' : 'Encerrar sessão'}
      </Button>
    </article>
  );
}

function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return 'Dispositivo desconhecido';
  // Heurística leve: pega o primeiro token significativo (Mozilla/5.0, curl/8.x, PostmanRuntime/7.x, etc.)
  const first = userAgent.split(/[/\s(]/)[0];
  return first && first.length > 0 ? first : userAgent.slice(0, 80);
}

function SessionsSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="border-border rounded-md border p-4">
          <div className="bg-muted h-4 w-40 animate-pulse rounded" />
          <div className="bg-muted mt-2 h-3 w-72 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

function SessionsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="border-danger/40 bg-danger/5 flex flex-col items-start gap-2 rounded-md border p-4"
    >
      <p className="text-sm">Não conseguimos listar suas sessões.</p>
      <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}
