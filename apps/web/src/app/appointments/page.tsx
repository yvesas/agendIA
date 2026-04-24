'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { useAppointments } from '@/hooks/use-appointments';
import { cn } from '@/lib/utils/cn';
import {
  formatDateTime,
  formatDurationMinutes,
  formatPriceFromCents,
} from '@/lib/utils/format';
import type { AppointmentStatus, AppointmentWithExam } from '@/types/appointment';

import { CancelAppointmentButton } from './cancel-appointment-button';

const SKELETON_COUNT = 3;

export default function AppointmentsPage() {
  const { data, isLoading, isError, refetch, isFetching } = useAppointments();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <span className="text-brand text-xs font-semibold tracking-widest uppercase">
          Agendia
        </span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Meus agendamentos
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Histórico completo de agendamentos vinculados à sua conta.
        </p>
      </header>

      {isError ? (
        <AppointmentsErrorState onRetry={() => void refetch()} />
      ) : isLoading && !data ? (
        <AppointmentsSkeleton />
      ) : data && data.length === 0 ? (
        <AppointmentsEmptyState />
      ) : data ? (
        <AppointmentsGroups items={data} isFetching={isFetching} />
      ) : null}
    </main>
  );
}

interface AppointmentsGroupsProps {
  items: AppointmentWithExam[];
  isFetching: boolean;
}

function AppointmentsGroups({ items, isFetching }: AppointmentsGroupsProps) {
  const { upcoming, past } = partitionByTime(items);

  return (
    <div className="space-y-10">
      <Section
        title="Próximos"
        emptyMessage="Nenhum agendamento futuro."
        items={upcoming}
        isFetching={isFetching}
      />
      <Section
        title="Passados"
        emptyMessage="Sem agendamentos passados."
        items={past}
        isFetching={false}
      />
    </div>
  );
}

interface SectionProps {
  title: string;
  emptyMessage: string;
  items: AppointmentWithExam[];
  isFetching: boolean;
}

function Section({ title, emptyMessage, items, isFetching }: SectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <span className="text-muted-foreground text-sm" aria-live="polite">
          {items.length} {items.length === 1 ? 'item' : 'itens'}
          {isFetching ? ' · atualizando...' : ''}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-lg border border-dashed px-4 py-6 text-sm">
          {emptyMessage}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((appointment) => (
            <li key={appointment.id}>
              <AppointmentCard appointment={appointment} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AppointmentCard({ appointment }: { appointment: AppointmentWithExam }) {
  const { id, exam, scheduledAt, status } = appointment;
  // eslint-disable-next-line react-hooks/purity -- comparação com 'agora' define se o botão aparece; a UI re-renderiza quando os dados mudam
  const canCancel = status === 'SCHEDULED' && new Date(scheduledAt).getTime() > Date.now();

  return (
    <article className="border-border bg-background flex flex-col gap-3 rounded-lg border p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <time
          dateTime={scheduledAt}
          className="text-foreground text-base font-semibold"
        >
          {formatDateTime(scheduledAt)}
        </time>
        <Link
          href={`/exams/${exam.id}`}
          className="text-muted-foreground hover:text-foreground block text-sm transition-colors"
        >
          {exam.name}
        </Link>
        <p className="text-muted-foreground text-xs">
          {formatDurationMinutes(exam.durationMin)} · {formatPriceFromCents(exam.priceCents)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={status} />
        {canCancel ? (
          <CancelAppointmentButton
            appointmentId={id}
            examName={exam.name}
            scheduledAt={scheduledAt}
          />
        ) : null}
      </div>
    </article>
  );
}

const STATUS_META: Record<AppointmentStatus, { label: string; className: string }> = {
  SCHEDULED: {
    label: 'Agendado',
    className: 'bg-brand-muted text-brand border-brand/30',
  },
  DONE: {
    label: 'Concluído',
    className: 'bg-muted text-muted-foreground border-border',
  },
  CANCELLED: {
    label: 'Cancelado',
    className: 'bg-danger/10 text-danger border-danger/30',
  },
};

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}

function AppointmentsSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="bg-muted h-6 w-32 animate-pulse rounded" />
      <ul className="space-y-3">
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <li key={index} className="border-border rounded-lg border p-5">
            <div className="space-y-2">
              <div className="bg-muted h-5 w-40 animate-pulse rounded" />
              <div className="bg-muted h-4 w-56 animate-pulse rounded" />
              <div className="bg-muted h-3 w-28 animate-pulse rounded" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AppointmentsEmptyState() {
  return (
    <div className="border-border bg-muted/40 space-y-4 rounded-lg border border-dashed p-10 text-center">
      <h2 className="text-lg font-semibold">Você ainda não tem agendamentos</h2>
      <p className="text-muted-foreground mx-auto max-w-sm text-sm">
        Explore os exames disponíveis e reserve um horário em poucos cliques.
      </p>
      <Link
        href="/exams"
        className="bg-brand text-brand-foreground inline-flex h-10 items-center rounded-md px-5 text-sm font-semibold transition-opacity hover:opacity-90"
      >
        Ver exames
      </Link>
    </div>
  );
}

function AppointmentsErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="border-danger/40 bg-danger/5 flex flex-col items-start gap-3 rounded-lg border p-6"
    >
      <div>
        <h2 className="text-foreground font-semibold">
          Não conseguimos carregar seus agendamentos
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">Tente novamente em instantes.</p>
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}

interface Partitioned {
  upcoming: AppointmentWithExam[];
  past: AppointmentWithExam[];
}

function partitionByTime(items: AppointmentWithExam[]): Partitioned {
  const now = Date.now();
  const upcoming: AppointmentWithExam[] = [];
  const past: AppointmentWithExam[] = [];

  for (const item of items) {
    const isFuture = new Date(item.scheduledAt).getTime() > now;
    const isScheduled = item.status === 'SCHEDULED';

    if (isFuture && isScheduled) {
      upcoming.push(item);
    } else {
      past.push(item);
    }
  }

  upcoming.sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );

  return { upcoming, past };
}
