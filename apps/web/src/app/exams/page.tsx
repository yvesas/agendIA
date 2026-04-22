'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ChangeEvent, Suspense, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type ExamsQuery, useExams } from '@/hooks/use-exams';
import { formatDurationMinutes, formatPriceFromCents } from '@/lib/utils/format';
import type { Exam } from '@/types/exam';

const DEBOUNCE_MS = 300;
const DEFAULT_LIMIT = 10;
const SKELETON_COUNT = 6;

export default function ExamsPage() {
  return (
    <Suspense fallback={<ExamsSkeleton />}>
      <ExamsScreen />
    </Suspense>
  );
}

function ExamsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get('search') ?? '';
  const currentPage = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);

  const [inputValue, setInputValue] = useState(currentSearch);

  useEffect(() => {
    if (inputValue === currentSearch) {
      return;
    }

    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (inputValue.length > 0) {
        params.set('search', inputValue);
      }
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [inputValue, currentSearch, pathname, router]);

  const query: ExamsQuery = {
    search: currentSearch,
    page: currentPage,
    limit: DEFAULT_LIMIT,
  };

  const { data, isLoading, isError, refetch, isFetching } = useExams(query);

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams();
    if (currentSearch.length > 0) {
      params.set('search', currentSearch);
    }
    if (nextPage > 1) {
      params.set('page', String(nextPage));
    }
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <span className="text-brand text-xs font-semibold tracking-widest uppercase">
          Agendia
        </span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Exames</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Busque pelo nome do exame e escolha um horário quando encontrar.
        </p>
      </header>

      <div className="mb-6 max-w-md space-y-1.5">
        <Label htmlFor="exam-search">Buscar exame</Label>
        <Input
          id="exam-search"
          type="search"
          placeholder="Ex.: hemograma, colesterol, TSH..."
          autoComplete="off"
          value={inputValue}
          onChange={handleSearchChange}
        />
      </div>

      {isError ? (
        <ExamsErrorState onRetry={() => void refetch()} />
      ) : isLoading && !data ? (
        <ExamsGridSkeleton />
      ) : data && data.items.length === 0 ? (
        <ExamsEmptyState search={currentSearch} />
      ) : data ? (
        <ExamsResults
          items={data.items}
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          total={data.meta.total}
          onNavigate={goToPage}
          isFetching={isFetching}
        />
      ) : null}
    </main>
  );
}

interface ExamsResultsProps {
  items: Exam[];
  page: number;
  totalPages: number;
  total: number;
  isFetching: boolean;
  onNavigate: (page: number) => void;
}

function ExamsResults({
  items,
  page,
  totalPages,
  total,
  isFetching,
  onNavigate,
}: ExamsResultsProps) {
  return (
    <>
      <p className="text-muted-foreground mb-4 text-sm" aria-live="polite">
        {total} {total === 1 ? 'exame encontrado' : 'exames encontrados'}
        {isFetching ? ' · atualizando...' : ''}
      </p>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((exam) => (
          <li key={exam.id}>
            <ExamCard exam={exam} />
          </li>
        ))}
      </ul>
      {totalPages > 1 ? (
        <Pagination page={page} totalPages={totalPages} onNavigate={onNavigate} />
      ) : null}
    </>
  );
}

function ExamCard({ exam }: { exam: Exam }) {
  return (
    <Link
      href={`/exams/${exam.id}`}
      className="border-border hover:border-brand/60 bg-background block h-full rounded-lg border p-5 transition-colors"
    >
      <article className="flex h-full flex-col">
        <h2 className="text-lg font-semibold tracking-tight">{exam.name}</h2>
        <p className="text-muted-foreground mt-2 line-clamp-3 text-sm">{exam.description}</p>
        <dl className="text-muted-foreground mt-auto flex items-center justify-between pt-4 text-sm">
          <div>
            <dt className="sr-only">Duração</dt>
            <dd>{formatDurationMinutes(exam.durationMin)}</dd>
          </div>
          <div>
            <dt className="sr-only">Preço</dt>
            <dd className="text-foreground font-semibold">
              {formatPriceFromCents(exam.priceCents)}
            </dd>
          </div>
        </dl>
      </article>
    </Link>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onNavigate: (page: number) => void;
}

function Pagination({ page, totalPages, onNavigate }: PaginationProps) {
  return (
    <nav
      aria-label="Paginação"
      className="mt-8 flex items-center justify-between gap-3 sm:gap-4"
    >
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={() => onNavigate(page - 1)}
        disabled={page <= 1}
        aria-label="Página anterior"
      >
        Anterior
      </Button>
      <span className="text-muted-foreground text-sm" aria-live="polite">
        Página {page} de {totalPages}
      </span>
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={() => onNavigate(page + 1)}
        disabled={page >= totalPages}
        aria-label="Próxima página"
      >
        Próximo
      </Button>
    </nav>
  );
}

function ExamsGridSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <li key={index}>
          <ExamCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

function ExamCardSkeleton() {
  return (
    <div className="border-border bg-background h-full space-y-3 rounded-lg border p-5">
      <div className="bg-muted h-5 w-2/3 animate-pulse rounded" />
      <div className="space-y-2">
        <div className="bg-muted h-3 w-full animate-pulse rounded" />
        <div className="bg-muted h-3 w-5/6 animate-pulse rounded" />
      </div>
      <div className="flex justify-between pt-2">
        <div className="bg-muted h-3 w-12 animate-pulse rounded" />
        <div className="bg-muted h-3 w-16 animate-pulse rounded" />
      </div>
    </div>
  );
}

function ExamsEmptyState({ search }: { search: string }) {
  return (
    <div className="border-border bg-muted/40 rounded-lg border border-dashed p-10 text-center">
      <h2 className="text-lg font-semibold">Nenhum exame encontrado</h2>
      <p className="text-muted-foreground mt-2 text-sm">
        {search.length > 0
          ? `Nenhum resultado para "${search}". Tente outro termo.`
          : 'Volte em instantes.'}
      </p>
    </div>
  );
}

function ExamsErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="border-danger/40 bg-danger/5 flex flex-col items-start gap-3 rounded-lg border p-6"
    >
      <div>
        <h2 className="text-foreground font-semibold">Não conseguimos carregar os exames</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Verifique sua conexão ou tente novamente em instantes.
        </p>
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}

function ExamsSkeleton() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 space-y-3" aria-hidden="true">
        <div className="bg-muted h-3 w-20 animate-pulse rounded" />
        <div className="bg-muted h-8 w-40 animate-pulse rounded" />
      </div>
      <ExamsGridSkeleton />
    </main>
  );
}
