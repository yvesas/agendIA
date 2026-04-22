'use client';

import { type InputHTMLAttributes, forwardRef } from 'react';

import { cn } from '@/lib/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid === true ? true : undefined}
      className={cn(
        'border-border bg-background text-foreground flex h-10 w-full rounded-md border px-3 text-sm',
        'placeholder:text-muted-foreground',
        'focus-visible:ring-brand/40 focus-visible:ring-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
        invalid === true && 'border-danger focus-visible:ring-danger/40',
        className,
      )}
      {...props}
    />
  );
});
