'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useChangePassword,
  useDeleteAccount,
  useProfile,
  useUpdateProfile,
} from '@/hooks/use-profile';
import { ApiError } from '@/lib/http';
import { emailSchema, nameSchema, passwordSchema } from '@/lib/validators/auth';

export default function ProfilePage() {
  const profile = useProfile();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-10 px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <span className="text-brand text-xs font-semibold tracking-widest uppercase">
          Agendia
        </span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Meu perfil
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Gerencie seus dados pessoais, senha de acesso e privacidade.
        </p>
      </header>

      {profile.isLoading && !profile.data ? (
        <ProfileSkeleton />
      ) : profile.isError ? (
        <ProfileErrorState onRetry={() => void profile.refetch()} />
      ) : profile.data ? (
        <>
          <ProfileSection
            initial={{ name: profile.data.name, email: profile.data.email }}
          />
          <PasswordSection />
          <DangerZoneSection />
        </>
      ) : null}
    </main>
  );
}

const profileSchema = z.object({
  name: nameSchema,
  email: emailSchema,
});
type ProfileForm = z.infer<typeof profileSchema>;

function ProfileSection({ initial }: { initial: ProfileForm }) {
  const update = useUpdateProfile();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: initial,
  });

  useEffect(() => {
    reset(initial);
  }, [initial.name, initial.email, reset]);

  async function onSubmit(values: ProfileForm) {
    const patch: Partial<ProfileForm> = {};
    if (values.name !== initial.name) patch.name = values.name;
    if (values.email !== initial.email) patch.email = values.email;

    if (Object.keys(patch).length === 0) {
      return;
    }

    try {
      const updated = await update.mutateAsync(patch);
      reset({ name: updated.name, email: updated.email });
      toast.success('Dados atualizados.');
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        return;
      }
      const message =
        error instanceof ApiError ? error.displayMessage : 'Falha ao atualizar dados.';
      toast.error(message);
    }
  }

  const pending = update.isPending || isSubmitting;

  return (
    <SectionCard
      title="Dados pessoais"
      description="Atualize seu nome e e-mail de acesso."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="profile-name">Nome</Label>
          <Input
            id="profile-name"
            type="text"
            autoComplete="name"
            invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'profile-name-error' : undefined}
            {...register('name')}
          />
          <FieldError id="profile-name-error" message={errors.name?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-email">E-mail</Label>
          <Input
            id="profile-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'profile-email-error' : undefined}
            {...register('email')}
          />
          <FieldError id="profile-email-error" message={errors.email?.message} />
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={pending} disabled={!isDirty || pending}>
            {pending ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe sua senha atual'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });
type PasswordForm = z.infer<typeof changePasswordSchema>;

function PasswordSection() {
  const change = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: PasswordForm) {
    try {
      await change.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Senha alterada com sucesso.');
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        toast.error('Senha atual incorreta.');
        return;
      }
      const message =
        error instanceof ApiError ? error.displayMessage : 'Falha ao alterar senha.';
      toast.error(message);
    }
  }

  const pending = change.isPending || isSubmitting;

  return (
    <SectionCard
      title="Senha"
      description="Altere sua senha de acesso. Recomendamos usar uma senha única e forte."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="current-password">Senha atual</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            invalid={Boolean(errors.currentPassword)}
            aria-describedby={errors.currentPassword ? 'current-password-error' : undefined}
            {...register('currentPassword')}
          />
          <FieldError id="current-password-error" message={errors.currentPassword?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-password">Nova senha</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            invalid={Boolean(errors.newPassword)}
            aria-describedby={errors.newPassword ? 'new-password-error' : undefined}
            {...register('newPassword')}
          />
          <FieldError id="new-password-error" message={errors.newPassword?.message} />
          <p className="text-muted-foreground text-xs">
            Mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirmar nova senha</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
            {...register('confirmPassword')}
          />
          <FieldError id="confirm-password-error" message={errors.confirmPassword?.message} />
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={pending} disabled={pending}>
            {pending ? 'Alterando...' : 'Alterar senha'}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

function DangerZoneSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const deleteAccount = useDeleteAccount();

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

  const canDelete = confirmation === 'EXCLUIR' && !deleteAccount.isPending;

  return (
    <SectionCard
      title="Privacidade (LGPD)"
      description="Excluir sua conta remove permanentemente seus dados pessoais e histórico de agendamentos. Esta ação não pode ser desfeita."
      tone="danger"
    >
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
              <strong className="text-foreground font-mono tracking-wider">EXCLUIR</strong>{' '}
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
              placeholder="EXCLUIR"
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

interface SectionCardProps {
  title: string;
  description: string;
  tone?: 'default' | 'danger';
  children: React.ReactNode;
}

function SectionCard({ title, description, tone = 'default', children }: SectionCardProps) {
  const toneClasses =
    tone === 'danger' ? 'border-danger/40 bg-danger/5' : 'border-border bg-background';

  return (
    <section className={`rounded-lg border p-6 sm:p-7 ${toneClasses}`}>
      <div className="mb-5 space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {children}
    </section>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="border-border space-y-4 rounded-lg border p-6">
          <div className="bg-muted h-5 w-40 animate-pulse rounded" />
          <div className="bg-muted h-3 w-72 animate-pulse rounded" />
          <div className="bg-muted h-10 w-full animate-pulse rounded" />
          <div className="bg-muted h-10 w-full animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

function ProfileErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="border-danger/40 bg-danger/5 flex flex-col items-start gap-3 rounded-lg border p-6"
    >
      <div>
        <h2 className="text-foreground font-semibold">
          Não conseguimos carregar seu perfil
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">Tente novamente em instantes.</p>
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}
