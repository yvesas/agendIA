'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateProfile } from '@/hooks/use-profile';
import { ApiError } from '@/lib/http';
import { emailSchema, nameSchema } from '@/lib/validators/auth';

import { SectionCard } from './section-card';

const profileSchema = z.object({
  name: nameSchema,
  email: emailSchema,
});
type ProfileForm = z.infer<typeof profileSchema>;

interface ProfileSectionProps {
  initial: ProfileForm;
}

export function ProfileSection({ initial }: ProfileSectionProps) {
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
