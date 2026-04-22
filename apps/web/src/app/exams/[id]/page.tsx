import type { Metadata } from 'next';

import type { Exam } from '@/types/exam';

import { ExamDetailClient } from './exam-detail-client';

const METADATA_CACHE_SECONDS = 300;
const DEFAULT_BASE_URL = 'http://localhost:3001';

interface ExamPageProps {
  params: Promise<{ id: string }>;
}

async function fetchExam(id: string): Promise<Exam | null> {
  const baseUrl =
    process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_BASE_URL;

  try {
    const response = await fetch(`${baseUrl}/exams/${id}`, {
      next: { revalidate: METADATA_CACHE_SECONDS },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as Exam;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: ExamPageProps): Promise<Metadata> {
  const { id } = await params;
  const exam = await fetchExam(id);

  if (!exam) {
    return { title: 'Exame não encontrado' };
  }

  return {
    title: exam.name,
    description: exam.description,
    openGraph: {
      title: exam.name,
      description: exam.description,
      type: 'website',
    },
  };
}

export default async function ExamPage({ params }: ExamPageProps) {
  const { id } = await params;
  return <ExamDetailClient id={id} />;
}
