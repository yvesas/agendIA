import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <span className="text-brand text-sm font-semibold tracking-widest uppercase">
        Agendia
      </span>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
        Agende seus exames sem fricção.
      </h1>
      <p className="text-muted-foreground mt-4 max-w-xl text-lg">
        Encontre o exame que você precisa, escolha um horário e confirme em segundos.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link
          href="/exams"
          className="bg-brand text-brand-foreground inline-flex h-11 items-center rounded-md px-6 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none"
        >
          Ver exames disponíveis
        </Link>
        <Link
          href="/login"
          className="border-border text-foreground hover:bg-muted inline-flex h-11 items-center rounded-md border px-6 text-sm font-semibold transition-colors"
        >
          Entrar
        </Link>
      </div>
    </main>
  );
}
