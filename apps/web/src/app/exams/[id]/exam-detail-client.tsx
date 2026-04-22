'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useExam } from '@/hooks/use-exam';
import { formatDurationMinutes, formatPriceFromCents } from '@/lib/utils/format';
import type { Exam } from '@/types/exam';

import { BookingModal } from './booking-modal';

interface ExamDetailClientProps {
  id: string;
}

export function ExamDetailClient({ id }: ExamDetailClientProps) {
  const { data: exam, isLoading, isError, error, refetch } = useExam(id);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/exams"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center text-sm transition-colors"
      >
        ← Voltar para exames
      </Link>

      {isLoading ? (
        <DetailSkeleton />
      ) : isError ? (
        <DetailErrorState notFound={error.isNotFound} onRetry={() => void refetch()} />
      ) : exam ? (
        <ExamDetail exam={exam} />
      ) : null}
    </main>
  );
}

function ExamDetail({ exam }: { exam: Exam }) {
  const { isAuthenticated } = useAuth();
  const [bookingOpen, setBookingOpen] = useState(false);

  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{exam.name}</h1>
        <p className="text-muted-foreground text-base leading-relaxed">{exam.description}</p>
      </header>

      <dl className="border-border grid grid-cols-2 gap-4 rounded-lg border p-5 sm:grid-cols-3">
        <InfoCell label="Duração" value={formatDurationMinutes(exam.durationMin)} />
        <InfoCell label="Preço" value={formatPriceFromCents(exam.priceCents)} highlighted />
        <InfoCell label="Modalidade" value="Presencial" />
      </dl>

      {exam.preparation ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Preparo</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">{exam.preparation}</p>
        </section>
      ) : (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Preparo</h2>
          <p className="text-muted-foreground text-sm">Nenhum preparo específico necessário.</p>
        </section>
      )}

      <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          Seu horário pode ser cancelado até a data do exame.
        </p>
        {isAuthenticated ? (
          <Button type="button" size="lg" onClick={() => setBookingOpen(true)}>
            Agendar exame
          </Button>
        ) : (
          <Link
            href={`/login?from=/exams/${exam.id}`}
            className="bg-brand text-brand-foreground inline-flex h-12 items-center justify-center rounded-md px-6 text-base font-semibold transition-opacity hover:opacity-90"
          >
            Entrar para agendar
          </Link>
        )}
      </div>

      <BookingModal
        exam={exam}
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
      />
    </article>
  );
}

interface InfoCellProps {
  label: string;
  value: string;
  highlighted?: boolean;
}

function InfoCell({ label, value, highlighted }: InfoCellProps) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
        {label}
      </dt>
      <dd
        className={
          highlighted === true
            ? 'text-foreground mt-1 text-lg font-semibold'
            : 'text-foreground mt-1 text-base font-medium'
        }
      >
        {value}
      </dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-8" aria-hidden="true">
      <div className="space-y-3">
        <div className="bg-muted h-9 w-2/3 animate-pulse rounded" />
        <div className="bg-muted h-4 w-full animate-pulse rounded" />
        <div className="bg-muted h-4 w-5/6 animate-pulse rounded" />
      </div>
      <div className="border-border grid grid-cols-2 gap-4 rounded-lg border p-5 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="space-y-2">
            <div className="bg-muted h-3 w-16 animate-pulse rounded" />
            <div className="bg-muted h-5 w-24 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface DetailErrorStateProps {
  notFound: boolean;
  onRetry: () => void;
}

function DetailErrorState({ notFound, onRetry }: DetailErrorStateProps) {
  if (notFound) {
    return (
      <div
        role="alert"
        className="border-border bg-muted/40 space-y-3 rounded-lg border border-dashed p-8 text-center"
      >
        <h2 className="text-lg font-semibold">Exame não encontrado</h2>
        <p className="text-muted-foreground text-sm">
          O exame que você está tentando ver não existe ou foi removido.
        </p>
        <Link href="/exams" className="text-brand inline-block text-sm font-semibold">
          Voltar para a listagem
        </Link>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="border-danger/40 bg-danger/5 flex flex-col items-start gap-3 rounded-lg border p-6"
    >
      <div>
        <h2 className="text-foreground font-semibold">Não conseguimos carregar o exame</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Tente novamente em instantes.
        </p>
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}
