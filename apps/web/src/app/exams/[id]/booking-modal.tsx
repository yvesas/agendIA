'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateAppointment } from '@/hooks/use-create-appointment';
import { ApiError } from '@/lib/http';
import type { Exam } from '@/types/exam';

const MIN_LEAD_TIME_MS = 15 * 60 * 1000;

const bookingSchema = z.object({
  scheduledAt: z
    .string()
    .min(1, 'Escolha uma data e hora')
    .refine((raw) => !Number.isNaN(new Date(raw).getTime()), 'Data inválida')
    .refine(
      (raw) => new Date(raw).getTime() > Date.now(),
      'Escolha um horário no futuro',
    ),
});

type BookingForm = z.infer<typeof bookingSchema>;

interface BookingModalProps {
  exam: Exam;
  open: boolean;
  onClose: () => void;
}

export function BookingModal({ exam, open, onClose }: BookingModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const createAppointment = useCreateAppointment();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { scheduledAt: '' },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  async function onSubmit(values: BookingForm) {
    try {
      const scheduledAt = new Date(values.scheduledAt).toISOString();
      await createAppointment.mutateAsync({ examId: exam.id, scheduledAt });
      toast.success('Agendamento confirmado!');
      onClose();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.displayMessage : 'Falha ao agendar.';
      toast.error(message);
    }
  }

  const minDateTime = buildMinDateTime();

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby={titleId}
      className="backdrop:bg-foreground/50 rounded-lg p-0 backdrop:backdrop-blur-sm"
    >
      <div className="bg-background text-foreground border-border w-[min(480px,90vw)] space-y-5 rounded-lg border p-6">
        <header className="space-y-1.5">
          <h2 id={titleId} className="text-lg font-semibold">
            Agendar {exam.name}
          </h2>
          <p className="text-muted-foreground text-sm">
            Escolha uma data e horário para realizar o exame.
          </p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="scheduledAt">Data e hora</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              min={minDateTime}
              invalid={Boolean(errors.scheduledAt)}
              aria-describedby={errors.scheduledAt ? 'scheduledAt-error' : undefined}
              {...register('scheduledAt')}
            />
            <FieldError id="scheduledAt-error" message={errors.scheduledAt?.message} />
          </div>

          <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row sm:gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={createAppointment.isPending}>
              {createAppointment.isPending ? 'Confirmando...' : 'Confirmar agendamento'}
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

function buildMinDateTime(): string {
  const now = new Date(Date.now() + MIN_LEAD_TIME_MS);
  const year = String(now.getFullYear()).padStart(4, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
