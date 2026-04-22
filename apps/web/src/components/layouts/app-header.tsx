'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils/cn';

interface NavItem {
  href: string;
  label: string;
  requiresAuth: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/exams', label: 'Exames', requiresAuth: false },
  { href: '/appointments', label: 'Meus agendamentos', requiresAuth: true },
];

export function AppHeader() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="border-border bg-background/80 sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="text-brand text-sm font-bold tracking-widest uppercase"
        >
          Agendia
        </Link>

        <nav aria-label="Principal" className="flex flex-1 items-center gap-1">
          {NAV_ITEMS.filter((item) => !item.requiresAuth || isAuthenticated).map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} pathname={pathname} />
          ))}
        </nav>

        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-muted-foreground hidden max-w-[200px] truncate text-sm sm:inline">
              Olá, {firstName(user.name)}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={logout}>
              Sair
            </Button>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-foreground hover:text-brand text-sm font-medium transition-colors"
          >
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}

interface NavLinkProps {
  href: string;
  label: string;
  pathname: string;
}

function NavLink({ href, label, pathname }: NavLinkProps) {
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </Link>
  );
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
