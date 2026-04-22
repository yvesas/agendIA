# Agendia

Portal de agendamento de exames para redes de laboratórios. Pacientes buscam exames, abrem detalhes e reservam horários por uma interface web integrada a uma API REST.

---

## Stack

| Camada             | Tecnologia                                            | Versão |
| ------------------ | ----------------------------------------------------- | ------ |
| API                | NestJS · TypeScript estrito · Passport (JWT)          | 11.x   |
| ORM                | Drizzle ORM · driver `postgres-js`                    | 0.45.x |
| Banco              | PostgreSQL                                            | 16     |
| Cache / rate-limit | Redis (via `@keyv/redis`)                             | 7      |
| Front-end          | Next.js 16 (App Router) · React 19 · TanStack Query 5 | —      |
| Forms              | React Hook Form · Zod                                 | —      |
| Estilo             | Tailwind CSS 4 · design tokens CSS                    | —      |
| Feedback           | Sonner (toasts)                                       | —      |
| Infra              | Docker Compose (multi-stage builds)                   | —      |
| Testes             | Jest · 14 testes unitários                            | —      |
| CI                 | GitHub Actions (lint + typecheck + test)              | —      |
| Docs               | Swagger/OpenAPI em `/docs`                            | —      |

> Drizzle foi escolhido em vez de Prisma por ser mais leve (sem engine runtime) e ter tipagem inferida do schema.

---

## Quick start

Requisitos: Docker 24+ e `docker compose`.

```bash
# 1. Clone o repositório
git clone git@github.com:yvesas/agendIA.git agendia
cd agendia

# 2. Sobe o stack inteiro (postgres + redis + api + web)
docker compose up
```

- Web: <http://localhost:3000>
- API: <http://localhost:3001>
- Swagger: <http://localhost:3001/docs>

**Credenciais demo** (criadas pelo seed automático no boot):

```
email:    demo@agendia.app
password: agendia123
```

Se as portas 3000/3001 já estiverem em uso, sobreescreva:

```bash
API_HOST_PORT=4001 WEB_HOST_PORT=4000 NEXT_PUBLIC_API_URL=http://localhost:4001 docker compose up
```

Para parar e limpar volumes:

```bash
docker compose down -v
```

---

## Estrutura do monorepo

```
agendia/
├── apps/
│   ├── api/              NestJS — módulos por agregado + auth/config/cache
│   │   ├── src/
│   │   │   ├── appointments/    controller, service, repository, DTOs
│   │   │   ├── auth/            JWT strategy, guard, decorator, service
│   │   │   ├── cache/           Redis cache module
│   │   │   ├── common/filters/  exception filter global
│   │   │   ├── config/          zod env schema + ConfigModule
│   │   │   ├── db/              drizzle schema, migrations, seed, migrator
│   │   │   ├── exams/           controller, service, repository, DTOs
│   │   │   ├── health/          GET /health
│   │   │   └── users/           users repository
│   │   ├── scripts/entrypoint.sh
│   │   └── drizzle.config.ts
│   └── web/              Next.js 16
│       └── src/
│           ├── app/             app router pages (landing, login, exams, appointments)
│           ├── components/      UI primitives (button, input, ...) + layouts
│           ├── hooks/           useAuth, useLogin, useExams, useAppointments, ...
│           ├── lib/             http client, auth storage, format utils
│           ├── providers/       QueryProvider + Toaster
│           ├── types/           shared types (exam, appointment)
│           └── proxy.ts         edge guard para rotas autenticadas
├── docker/
│   ├── api.Dockerfile           multi-stage (builder + runtime)
│   └── web.Dockerfile           multi-stage + Next.js standalone
├── .github/workflows/ci.yml     lint + typecheck + test
├── docker-compose.yml
├── package.json                 npm workspaces
└── tsconfig.base.json           TS estrito herdado pelos apps
```

---

## API — endpoints

Documentação interativa completa em **<http://localhost:3001/docs>** (Swagger UI com `Authorize`).

| Método | Rota             | Auth   | Descrição                                                                         |
| ------ | ---------------- | ------ | --------------------------------------------------------------------------------- |
| POST   | `/auth/register` | —      | Cria conta, retorna `{ accessToken, user }` (5/min)                               |
| POST   | `/auth/login`    | —      | Autentica, retorna `{ accessToken, user }` (5/min)                                |
| GET    | `/exams`         | —      | Lista paginada com busca (`?search=&page=&limit=`), cacheada no Redis (TTL 5 min) |
| GET    | `/exams/:id`     | —      | Detalhe de um exame                                                               |
| POST   | `/appointments`  | Bearer | Cria agendamento; valida exame, futuro e conflito de janela                       |
| GET    | `/appointments`  | Bearer | Lista agendamentos do usuário com exame embutido                                  |
| GET    | `/health`        | —      | Status do serviço                                                                 |

Envelope de erro padrão (aplicado por `AllExceptionsFilter`):

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Time conflicts with an existing appointment",
  "timestamp": "2026-04-22T20:15:03.421Z",
  "path": "/appointments"
}
```

---

## Desenvolvimento local (fora do Docker)

```bash
# Instala deps de todos os workspaces
npm install

# Sobe só postgres + redis via docker
docker compose up postgres redis -d

# API (na raiz do repo)
DATABASE_URL=postgres://agendia:agendia@localhost:5432/agendia \
REDIS_URL=redis://localhost:6379 \
JWT_ACCESS_SECRET=dev-access-secret-please-change-me-32c \
JWT_REFRESH_SECRET=dev-refresh-secret-please-change-me-32c \
npm run dev --workspace=@agendia/api

# Web (outro terminal)
NEXT_PUBLIC_API_URL=http://localhost:3001 npm run dev --workspace=@agendia/web
```

Scripts disponíveis na raiz (fan-out para workspaces):

```bash
npm run dev         # nest start --watch + next dev
npm run build       # nest build + next build
npm run lint        # eslint em api e web
npm run typecheck   # tsc --noEmit em api e web
npm run test        # jest (api)
npm run format      # prettier --write
```

Scripts de banco (`@agendia/api`):

```bash
npm run db:generate --workspace=@agendia/api    # cria migration a partir do schema
npm run db:migrate --workspace=@agendia/api     # aplica migrations (drizzle-kit, dev)
npm run db:seed --workspace=@agendia/api        # seed local via ts-node
npm run db:studio --workspace=@agendia/api      # drizzle studio
```

---

## Variáveis de ambiente

Todas em `.env.example`. Principais:

| Variável                  | Obrigatória | Default                 | Descrição                                                                    |
| ------------------------- | ----------- | ----------------------- | ---------------------------------------------------------------------------- |
| `DATABASE_URL`            | sim         | —                       | Connection string Postgres                                                   |
| `REDIS_URL`               | sim         | —                       | URL Redis                                                                    |
| `JWT_ACCESS_SECRET`       | sim         | —                       | ≥ 32 chars, valida na boot                                                   |
| `JWT_ACCESS_EXPIRES_IN`   | não         | `15m`                   | Formato `ms` (`15m`, `1h`, `7d`)                                             |
| `JWT_REFRESH_SECRET`      | sim         | —                       | ≥ 32 chars                                                                   |
| `BCRYPT_SALT_ROUNDS`      | não         | `12`                    | Cost factor bcrypt                                                           |
| `EXAMS_CACHE_TTL_SECONDS` | não         | `300`                   | TTL cache Redis da listagem                                                  |
| `API_PORT`                | não         | `3001`                  | Porta da API dentro do container                                             |
| `API_HOST_PORT`           | não         | `3001`                  | Porta exposta no host pelo compose                                           |
| `WEB_PORT`                | não         | `3000`                  | Porta do Next.js dentro do container                                         |
| `WEB_HOST_PORT`           | não         | `3000`                  | Porta exposta no host pelo compose                                           |
| `NEXT_PUBLIC_API_URL`     | build-time  | `http://localhost:3001` | URL da API acessada pelo browser (bake no bundle)                            |
| `INTERNAL_API_URL`        | não         | `NEXT_PUBLIC_API_URL`   | URL da API usada pelo Next em SSR (ex.: `http://api:3001` dentro do compose) |

---

## Decisões técnicas

### Arquitetura

- **Monorepo com npm workspaces** em vez de pnpm/Turborepo: zero pré-requisito para o reviewer; suficiente para dois workspaces.
- **NestJS modular** — um módulo por agregado (`users`, `auth`, `exams`, `appointments`, `health`) mais módulos transversais (`config`, `cache`, `db`). Nenhum feature module importa outro desnecessariamente.
- **Padrão Repository por agregado** (DIP): services dependem de repositórios nomeados, não do Drizzle cru. Facilita mock em teste e troca futura de ORM.
- **`DatabaseModule` global** com provider `DRIZZLE` (Symbol) e cleanup em `OnApplicationShutdown` — pool termina ao receber SIGTERM.

### Validação e tipagem

- **Env validada no boot** via zod (`src/config/env.schema.ts`): app falha loud com lista de erros agrupada se algo estiver ausente/errado.
- **`ConfigService<EnvVars, true>`** tipado em todos os consumers — sem `process.env.X!` espalhado.
- **`ValidationPipe` global** com `whitelist`, `forbidNonWhitelisted`, `transform` e `enableImplicitConversion` — DTOs rejeitam qualquer campo não-declarado.
- **TypeScript estrito** (`noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals/Parameters`, `strictNullChecks`) em toda a base, sem `any`.

### Autenticação

- **JWT access token** assinado por `@nestjs/jwt` com secret validado (≥32 chars).
- **`JwtStrategy.validate`** re-busca o usuário a cada request — token de conta deletada perde acesso imediatamente.
- **Anti-account-enumeration**: login retorna o mesmo `401 "Invalid credentials"` para email inexistente e senha errada.
- **`PasswordHasher` abstrato**: bcrypt encapsulado — service não importa a lib direta. Troca futura (argon2/scrypt) é uma linha.
- **Cookie (não httpOnly) para o token no front**: trade-off consciente — XSS é um risco, mas httpOnly exigiria proxy Next.js para todas as chamadas. SameSite=Lax + Secure em prod mitigam. Swap para httpOnly + API routes é refactor localizado.

### Dados

- **Drizzle ORM + `postgres` driver**: leve, SQL-like, tipagem inferida do schema (`$inferSelect`/`$inferInsert`), sem engine runtime.
- **Schema em arquivos por tabela** (`users.ts`, `exams.ts`, `appointments.ts`) + barrel.
- **Money como `integer priceCents`**: evita floats em aritmética monetária; nome explícito sobre a unidade.
- **Índice único composto `(user_id, scheduled_at)`**: rede de segurança no banco contra double-booking exato, complementar ao conflict-check da aplicação.
- **Conflict detection por overlap real**: `innerJoin` com `exams` + `make_interval(mins => duration_min)` — calcula `[start, start + duration)` usando a duração de cada appointment existente.
- **Seed idempotente** (`onConflictDoNothing`): docker-compose up pode rodar N vezes sem duplicar nada.

### Cache

- **Redis via `@keyv/redis`** (store do cache-manager v7) registrado em `CacheModule` global.
- **Apenas `GET /exams` usa `@UseInterceptors(CacheInterceptor)`** — detalhe (`/exams/:id`) fica sem cache para priorizar freshness numa decisão de agendamento.
- **TTL configurável** (`EXAMS_CACHE_TTL_SECONDS`, default 5 min).
- **Cache key default = URL completa com query string** — simples e adequado ao escopo; trade-off de sensibilidade à ordem de parâmetros está documentado no commit.

### Front-end

- **App Router** com `generateMetadata` server-side em `/exams/[id]` — SEO real (title, description, og:\*), fetch cacheado por 5min (`next: { revalidate: 300 }`).
- **Estado de auth no React Query** (`AUTH_QUERY_KEY = ['auth', 'me']`): login publica via `setQueryData` → todos os subscribers atualizam em um tick, sem context custom.
- **URL como source of truth em `/exams`**: `?search=&page=` sobrevive a refresh, back/forward e compartilhamento.
- **Debounce no search** (300ms via `router.replace`) — não polui histórico; page reseta automaticamente ao mudar busca.
- **`keepPreviousData`**: transição de página sem flash-para-vazio.
- **Retry inteligente**: 4xx nunca retenta; 5xx retenta 1x; mutations nunca retentam (duplicação pior que erro visível).
- **Form validation**: Zod schema + `@hookform/resolvers/zod` — tipo do form vem de `z.infer`, garantindo lockstep entre runtime e compile-time.
- **Design tokens CSS** (`@theme inline` Tailwind 4) — paleta luz/escuro muda em um só lugar; componentes usam `bg-brand`, `text-muted-foreground`.
- **`<dialog>` nativo para booking** — focus trap, ESC, backdrop e scroll lock vindos da plataforma; zero dependência de modal lib.
- **Proxy (Next.js 16)** em `src/proxy.ts` protege `/appointments/:path*` lendo o cookie; redirect preserva `?from=` para retornar depois do login.

### UX / A11y

- **Skeletons mimetizam o layout real** (sem paint-shift).
- **5 estados explícitos** por screen: loading, error (com retry), empty (com CTA), populated, fetching.
- **Status badges table-driven** (`STATUS_META` record) — novo status vira uma linha, zero branching (OCP).
- **`<time dateTime={iso}>`**, `role="alert"` em erros, `aria-live="polite"` em contadores, `aria-current="page"` em nav ativo, `aria-invalid`/`aria-describedby` em inputs.
- **`autoComplete`/`inputMode` adequados** em todos os forms — password manager + teclado mobile correto.
- **Loading state em botões** (`aria-busy`, texto "Entrando..." / "Confirmando...").
- **Microcopy com verbos de ação** — "Agendar exame", "Entrar para agendar", "Ver exames" (não "OK").

### Qualidade

- **14 testes unitários** cobrindo services críticos (auth e appointments), incluindo casos de borda como enumeration guard e window-math.
- **Exception filter global** produz envelope padronizado (`{statusCode, error, message, timestamp, path}`) — monitoramento tem um único contrato para ingerir.
- **Clean Code**: constantes nomeadas para todo número mágico (`MS_PER_MINUTE`, `CACHE_TTL_SECONDS`, `CLIENT_ERROR_FLOOR`, `DEFAULT_LIMIT`, ...), funções pequenas, early return, `Result`/exception explícita em vez de null chains.

---

## Diferenciais implementados

- **Swagger/OpenAPI** em `/docs` (UI com `Authorize` persistindo token).
- **Testes unitários** nos services críticos (14 testes, Jest).
- **Rate limiting** com `@nestjs/throttler`: 60/min global, `/auth/login` 5/min, `/auth/register` 10/h.
- **SEO** — meta tags dinâmicas via `generateMetadata` em `/exams/[id]` (title, description, openGraph).
- **CI** (GitHub Actions): lint + typecheck + test em push/PR para `main`/`develop`.
- **GitFlow** com commits atômicos (Conventional Commits) — veja `git log --oneline`.

---

## Rodando os testes

```bash
# Todos os workspaces
npm run test

# Api apenas
npm run test --workspace=@agendia/api

# Com coverage
npm run test:cov --workspace=@agendia/api

# E2E (health endpoint)
npm run test:e2e --workspace=@agendia/api
```

Cobertura atual:

- `AuthService`: 7 testes — register (success/conflict/anti-leak), login (success/missing email/wrong password + enumeration guard).
- `AppointmentsService`: 7 testes — create (success/past/invalid iso/conflict/missing exam/window-math), listByUser.

---

## Trade-offs e próximos passos

Itens deixados fora do escopo por tempo, mas com caminho de evolução claro:

1. **Refresh token dedicado** — secret e expiração (`JWT_REFRESH_*`) já validados no env. Falta a rota `POST /auth/refresh` e storage do refresh em DB (para permitir revogação). Próximo: tabela `refresh_tokens (id, user_id, hash, expires_at, revoked_at)` + rotação em cada uso.

2. **Throttler backed por Redis** — hoje roda em memória. Para scale horizontal, trocar por uma implementação customizada de `ThrottlerStorage` usando `ioredis`/`keyv-redis` — ~30 linhas, uma flag.

3. **Token em cookie httpOnly + proxy** — seria a versão XSS-proof. Implica Next.js API routes que replicam endpoints da API, ou um gateway. Refactor localizado (api-client + /api routes), ~1 dia.

4. **Coverage em features do front** — hoje temos só unit tests no back. Próximo: Vitest + Testing Library para `useExams`, `useLogin`, booking-modal submit flow.

5. **Cancelamento de agendamento** — UI só lista; não cancela. Endpoint `PATCH /appointments/:id/cancel` + botão no card (que vira `CANCELLED`, liberando a janela) são ~50 linhas.

6. **Observability** — logs estruturados (pino), métricas prometheus, trace OpenTelemetry. Infra pronta, só falta plugar.

7. **Validação do token na edge** — proxy atual só checa presença do cookie. Validar assinatura na edge exige biblioteca compatível com Edge Runtime (`jose` é o padrão). Dá para cortar requests de tokens expirados antes de chegar à API.

8. **Cache invalidation em mutações** — hoje não há endpoints de escrita em `/exams`. Quando existirem, invalidação via `CACHE_MANAGER` provider global já disponível.

---

## GitFlow e commits

- `main` — base estável.
- `develop` — integração.
- Features em branches curtas (omitido aqui por ser single-contributor).
- Conventional Commits: `feat(api):`, `feat(web):`, `chore(docker):`, `test(api):`, `refactor(web):`, `docs(...)`.
- Cada commit é atômico e descreve o **por quê** (não apenas o "o quê") — `git log` deve ler-se como uma narrativa da implementação.

---

## Licença

MIT — ver [LICENSE](./LICENSE).
