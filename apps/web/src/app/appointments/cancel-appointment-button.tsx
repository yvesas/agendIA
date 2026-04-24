'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useCancelAppointment } from '@/hooks/use-cancel-appointment';
import { ApiError } from '@/lib/http';
import { formatDateTime } from '@/lib/utils/format';

interface CancelAppointmentButtonProps {
  appointmentId: string;
  examName: string;
  scheduledAt: string;
}

export function CancelAppointmentButton({
  appointmentId,
  examName,
  scheduledAt,
}: CancelAppointmentButtonProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const cancel = useCancelAppointment();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function close() {
    if (cancel.isPending) return;
    setOpen(false);
  }

  async function onConfirm() {
    try {
      await cancel.mutateAsync(appointmentId);
      setOpen(false);
      toast.success('Agendamento cancelado.');
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        return;
      }
      const message =
        error instanceof ApiError ? error.displayMessage : 'Falha ao cancelar.';
      toast.error(message);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        className="shrink-0"
      >
        Cancelar
      </Button>

      <dialog
        ref={dialogRef}
        onClose={close}
        onCancel={close}
        aria-labelledby={titleId}
        className="fixed inset-0 m-auto h-fit w-fit max-w-[90vw] rounded-lg backdrop:bg-foreground/50 backdrop:backdrop-blur-sm"
      >
        <div className="bg-background text-foreground border-border w-[min(460px,90vw)] space-y-5 rounded-lg border p-6">
          <header className="space-y-1.5">
            <h2 id={titleId} className="text-lg font-semibold">
              Cancelar agendamento?
            </h2>
            <p className="text-muted-foreground text-sm">
              Você está prestes a cancelar{' '}
              <strong className="text-foreground">{examName}</strong> em{' '}
              <strong className="text-foreground">{formatDateTime(scheduledAt)}</strong>. Esta
              ação não pode ser desfeita.
            </p>
          </header>

          <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row sm:gap-3">
            <Button type="button" variant="secondary" onClick={close} disabled={cancel.isPending}>
              Voltar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={onConfirm}
              loading={cancel.isPending}
              disabled={cancel.isPending}
            >
              {cancel.isPending ? 'Cancelando...' : 'Cancelar agendamento'}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
