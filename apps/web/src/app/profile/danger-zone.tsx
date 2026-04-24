'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDeleteAccount, useExportMyData } from '@/hooks/use-profile';
import { ApiError } from '@/lib/http';

import { SectionCard } from './section-card';

function downloadJsonFile(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const CONFIRMATION_WORD = 'EXCLUIR';

export function DangerZone() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const deleteAccount = useDeleteAccount();
  const exportData = useExportMyData();

  async function onExport() {
    try {
      const data = await exportData.mutateAsync();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJsonFile(data, `agendia-meus-dados-${stamp}.json`);
      toast.success('Download iniciado.');
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        return;
      }
      const message =
        error instanceof ApiError ? error.displayMessage : 'Falha ao exportar dados.';
      toast.error(message);
    }
  }

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
    setOpen(false);
    setConfirmation('');
  }

  async function onConfirm() {
    try {
      await deleteAccount.mutateAsync();
      close();
      toast.success('Conta excluída. Seus dados foram removidos.');
      router.replace('/login');
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        return;
      }
      const message =
        error instanceof ApiError ? error.displayMessage : 'Falha ao excluir conta.';
      toast.error(message);
    }
  }

  const canDelete = confirmation === CONFIRMATION_WORD && !deleteAccount.isPending;

  return (
    <SectionCard
      title="Privacidade (LGPD)"
      description="Excluir sua conta remove permanentemente seus dados pessoais e histórico de agendamentos. Esta ação não pode ser desfeita."
      tone="danger"
    >
      <div className="space-y-4">
        <div className="border-border bg-background flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            Baixe um arquivo JSON com seus dados pessoais e histórico de agendamentos.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={onExport}
            loading={exportData.isPending}
            disabled={exportData.isPending}
            className="shrink-0 font-medium whitespace-nowrap"
          >
            {exportData.isPending ? 'Gerando...' : 'Baixar meus dados'}
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            Ao excluir, todos os agendamentos associados serão removidos junto com seus dados.
          </p>
          <Button
            type="button"
            variant="danger"
            onClick={() => setOpen(true)}
            className="shrink-0 px-5 font-medium whitespace-nowrap"
          >
            Excluir minha conta
          </Button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        onClose={close}
        onCancel={close}
        aria-labelledby={titleId}
        className="fixed inset-0 m-auto h-fit w-fit max-w-[90vw] rounded-lg backdrop:bg-foreground/50 backdrop:backdrop-blur-sm"
      >
        <div className="bg-background text-foreground border-border w-[min(480px,90vw)] space-y-5 rounded-lg border p-6">
          <header className="space-y-1.5">
            <h2 id={titleId} className="text-lg font-semibold">
              Excluir conta permanentemente?
            </h2>
            <p className="text-muted-foreground text-sm">
              Digite{' '}
              <strong className="text-foreground font-mono tracking-wider">
                {CONFIRMATION_WORD}
              </strong>{' '}
              para confirmar. Seus dados pessoais e agendamentos serão apagados.
            </p>
          </header>

          <div className="space-y-1.5">
            <Label htmlFor="delete-confirm">Confirmação</Label>
            <Input
              id="delete-confirm"
              type="text"
              autoComplete="off"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={CONFIRMATION_WORD}
            />
          </div>

          <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row sm:gap-3">
            <Button type="button" variant="secondary" onClick={close}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={onConfirm}
              disabled={!canDelete}
              loading={deleteAccount.isPending}
            >
              {deleteAccount.isPending ? 'Excluindo...' : 'Excluir permanentemente'}
            </Button>
          </div>
        </div>
      </dialog>
    </SectionCard>
  );
}
