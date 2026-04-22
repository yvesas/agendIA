export interface Exam {
  id: string;
  name: string;
  slug: string;
  description: string;
  preparation: string | null;
  durationMin: number;
  priceCents: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ExamsListResponse {
  items: Exam[];
  meta: PaginationMeta;
}
