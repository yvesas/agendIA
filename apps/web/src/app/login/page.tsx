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
import { useLogin } from '@/hooks/use-login';
import { ApiError } from '@/lib/http';

const loginSchema = z.object({
  email: z.string().min(1, 'Informe seu e-mail').email('E-mail inválido'),
  password: z.string().min(1, 'Informe sua senha'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginScreen />
    </Suspense>
  );
}

function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const login = useLogin();

  const redirectTarget = searchParams.get('from') ?? '/exams';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'demo@agendia.app', password: 'agendia123' },
  });

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectTarget);
    }
  }, [isAuthenticated, redirectTarget, router]);

  async function onSubmit(values: LoginForm) {
    try {
      await login.mutateAsync(values);
      toast.success('Bem-vindo ao Agendia.');
      router.replace(redirectTarget);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.displayMessage : 'Não foi possível entrar.';
      toast.error(message);
    }
  }

  const pending = login.isPending || isSubmitting;

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
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Entrar</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Acesse sua conta para agendar exames.
          </p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
            <FieldError id="email-error" message={errors.email?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
            />
            <FieldError id="password-error" message={errors.password?.message} />
          </div>

          <Button type="submit" size="lg" loading={pending} className="w-full">
            {pending ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-xs">
          Use <strong>demo@agendia.app</strong> / <strong>agendia123</strong> para
          demonstração.
        </p>
      </div>
    </main>
  );
}

function LoginSkeleton() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6" aria-hidden="true">
        <div className="bg-muted h-8 w-40 animate-pulse rounded" />
        <div className="space-y-3">
          <div className="bg-muted h-10 w-full animate-pulse rounded" />
          <div className="bg-muted h-10 w-full animate-pulse rounded" />
          <div className="bg-muted h-12 w-full animate-pulse rounded" />
        </div>
      </div>
    </main>
  );
}
