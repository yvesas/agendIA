'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useRegister } from '@/hooks/use-register';
import { ApiError } from '@/lib/http';
import { emailSchema, nameSchema, passwordSchema } from '@/lib/validators/auth';

const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterSkeleton />}>
      <RegisterScreen />
    </Suspense>
  );
}

function RegisterScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const register = useRegister();

  const redirectTarget = searchParams.get('from') ?? '/exams';

  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectTarget);
    }
  }, [isAuthenticated, redirectTarget, router]);

  async function onSubmit(values: RegisterForm) {
    try {
      await register.mutateAsync(values);
      toast.success('Conta criada com sucesso!');
      router.replace(redirectTarget);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.displayMessage : 'Não foi possível criar sua conta.';
      toast.error(message);
    }
  }

  const pending = register.isPending || isSubmitting;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <header className="text-center">
          <Link
            href="/"
            className="text-brand text-sm font-semibold tracking-widest uppercase"
          >
            Agendia
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Criar conta</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Cadastre-se em segundos para agendar seus exames.
          </p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'name-error' : undefined}
              {...field('name')}
            />
            <FieldError id="name-error" message={errors.name?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...field('email')}
            />
            <FieldError id="email-error" message={errors.email?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...field('password')}
            />
            <FieldError id="password-error" message={errors.password?.message} />
            <p className="text-muted-foreground text-xs">
              Mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.
            </p>
          </div>

          <Button type="submit" size="lg" loading={pending} className="w-full">
            {pending ? 'Criando conta...' : 'Criar conta'}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          Já tem conta?{' '}
          <Link
            href={{ pathname: '/login', query: redirectTarget === '/exams' ? undefined : { from: redirectTarget } }}
            className="text-brand font-medium hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}

function RegisterSkeleton() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6" aria-hidden="true">
        <div className="bg-muted h-8 w-48 animate-pulse rounded" />
        <div className="space-y-3">
          <div className="bg-muted h-10 w-full animate-pulse rounded" />
          <div className="bg-muted h-10 w-full animate-pulse rounded" />
          <div className="bg-muted h-10 w-full animate-pulse rounded" />
          <div className="bg-muted h-12 w-full animate-pulse rounded" />
        </div>
      </div>
    </main>
  );
}
