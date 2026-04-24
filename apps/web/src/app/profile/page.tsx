'use client';

import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/use-profile';

import { DangerZone } from './danger-zone';
import { PasswordSection } from './password-section';
import { ProfileSection } from './profile-section';

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
          <DangerZone />
        </>
      ) : null}
    </main>
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
