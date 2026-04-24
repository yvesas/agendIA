'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChangePassword } from '@/hooks/use-profile';
import { ApiError } from '@/lib/http';
import { passwordSchema } from '@/lib/validators/auth';

import { SectionCard } from './section-card';

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

export function PasswordSection() {
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
