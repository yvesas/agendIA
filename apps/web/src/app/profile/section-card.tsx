import { type ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface SectionCardProps {
  title: string;
  description: string;
  tone?: 'default' | 'danger';
  children: ReactNode;
}

export function SectionCard({
  title,
  description,
  tone = 'default',
  children,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        'rounded-lg border p-6 sm:p-7',
        tone === 'danger' ? 'border-danger/40 bg-danger/5' : 'border-border bg-background',
      )}
    >
      <div className="mb-5 space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {children}
    </section>
  );
}
