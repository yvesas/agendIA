# Agendia

Portal de agendamento de exames para redes de laboratórios. Pacientes buscam exames, abrem detalhes, agendam, cancelam e gerenciam sua conta (LGPD inclusive) por uma interface web integrada a uma API REST.

---

## Stack

| Camada             | Tecnologia                                                         | Versão |
| ------------------ | ------------------------------------------------------------------ | ------ |
| API                | NestJS · TypeScript estrito · Passport (JWT)                       | 11.x   |
| ORM                | Drizzle ORM · driver `postgres-js`                                 | 0.45.x |
| Banco              | PostgreSQL                                                         | 16     |
| Cache / rate-limit | Redis (via `@keyv/redis`)                                          | 7      |
| Front-end          | Next.js 16 (App Router) · React 19 · TanStack Query 5              | —      |
| Forms              | React Hook Form · Zod                                              | —      |
| Estilo             | Tailwind CSS 4 · design tokens CSS                                 | —      |
| Feedback           | Sonner (toasts)                                                    | —      |
| Validação SSOT     | `@agendia/contracts` — schemas Zod compartilhados api ↔ web        | —      |
| Infra              | Docker Compose (multi-stage builds)                                | —      |
| Testes             | Jest · **50 unitários + 38 e2e**                                   | —      |
| CI                 | GitHub Actions — lint + typecheck + unit + e2e (services PG/Redis) | —      |
| Hooks locais       | Husky + lint-staged (pre-commit) · typecheck (pre-push)            | —      |
| Docs               | Swagger/OpenAPI em `/docs`                                         | —      |

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
- Postgres exposto em `localhost:5432` (para dev/testes locais)
- Redis exposto em `localhost:6379`

**Credenciais demo** (criadas/atualizadas pelo seed automático no boot):

```
email:    demo@agendia.app
password: Agendia@123
```

Se as portas padrão já estiverem em uso, sobrescreva:

```bash
API_HOST_PORT=4001 \
WEB_HOST_PORT=4000 \
POSTGRES_HOST_PORT=55432 \
REDIS_HOST_PORT=56379 \
NEXT_PUBLIC_API_URL=http://localhost:4001 \
docker compose up
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
│   │   │   ├── auth/            JWT strategy, guard, decorator, service, refresh
│   │   │   ├── cache/           Redis cache module
│   │   │   ├── common/filters/  exception filter global
│   │   │   ├── common/pipes/    ZodValidationPipe
│   │   │   ├── config/          zod env schema + ConfigModule
│   │   │   ├── db/              drizzle schema, migrations, seed, migrator
│   │   │   ├── exams/           controller, service, repository, DTOs
│   │   │   ├── health/          GET /health
│   │   │   └── users/           controller, service, repository (me CRUD)
│   │   ├── test/                e2e specs + helpers (createTestApp, factories, cleanup)
│   │   ├── scripts/entrypoint.sh
│   │   └── drizzle.config.ts
│   └── web/              Next.js 16
│       └── src/
│           ├── app/             app router (landing, login, register, exams,
│           │                     appointments, profile com seções)
│           ├── components/      UI primitives + layouts (app-header)
│           ├── hooks/           useAuth, useLogout, useLogin, useRegister,
│           │                     useProfile, useExams, useAppointments,
│           │                     useCancelAppointment, ...
│           ├── lib/             http client (auto-refresh), auth storage,
│           │                     session-events, validators (re-export SSOT)
│           ├── providers/       QueryProvider + SessionGuard + Toaster
│           ├── types/           shared types (exam, appointment)
│           └── proxy.ts         Next.js proxy (gate para /appointments, /profile)
├── packages/
│   └── contracts/        Schemas Zod compartilhados (SSOT api ↔ web)
│       └── src/          fields, auth, users (registerSchema, loginSchema,
│                          passwordSchema, updateProfileSchema, ...)
├── docker/
│   ├── api.Dockerfile           multi-stage (builder → runtime + migrations)
│   └── web.Dockerfile           multi-stage + Next.js standalone
├── .github/workflows/ci.yml     quality + e2e (com services postgres/redis)
├── .husky/                      pre-commit (lint-staged) + pre-push (typecheck)
├── lint-staged.config.mjs
├── docker-compose.yml
├── package.json                 npm workspaces
└── tsconfig.base.json           TS estrito herdado pelos apps
```

---

## API — endpoints

Documentação interativa completa em **<http://localhost:3001/docs>** (Swagger UI com `Authorize`).

| Método | Rota                       | Auth   | Descrição                                                                        |
| ------ | -------------------------- | ------ | -------------------------------------------------------------------------------- |
| POST   | `/auth/register`           | —      | Cria conta com senha forte; retorna `{ accessToken, refreshToken, user }` (10/h) |
| POST   | `/auth/login`              | —      | Autentica; retorna `{ accessToken, refreshToken, user }` (5/min)                 |
| POST   | `/auth/refresh`            | —      | Troca refresh por novos tokens; falha ⇒ 401 (30/min)                             |
| GET    | `/users/me`                | Bearer | Dados do usuário autenticado                                                     |
| PATCH  | `/users/me`                | Bearer | Atualiza `name` e/ou `email`; 409 se email colidir                               |
| PUT    | `/users/me/password`       | Bearer | Troca senha (valida `currentPassword`); 401 se senha atual errada                |
| DELETE | `/users/me`                | Bearer | Remove conta e cascateia agendamentos (LGPD)                                     |
| GET    | `/exams`                   | —      | Lista paginada com busca; cacheada no Redis (TTL 5 min)                          |
| GET    | `/exams/:id`               | —      | Detalhe de um exame                                                              |
| POST   | `/appointments`            | Bearer | Cria agendamento; valida exame, futuro e conflito de janela                      |
| GET    | `/appointments`            | Bearer | Lista agendamentos do usuário com exame embutido                                 |
| PATCH  | `/appointments/:id/cancel` | Bearer | Cancela agendamento próprio e futuro; 403/409 conforme caso                      |
| GET    | `/health`                  | —      | Status do serviço                                                                |

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

Validação de DTO via **ZodValidationPipe** anota o campo que falhou:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["password: Inclua ao menos uma letra maiúscula", "email: E-mail inválido"]
}
```

---

## Desenvolvimento local (fora do Docker)

```bash
# 1. Instala deps de todos os workspaces (husky se registra automaticamente)
npm install

# 2. Builda o pacote de contracts (api e web importam dele)
npm run build --workspace=@agendia/contracts

# 3. Sobe só postgres + redis via docker (portas expostas no host)
docker compose up postgres redis -d

# 4. API (na raiz do repo)
DATABASE_URL=postgres://agendia:agendia@localhost:5432/agendia \
REDIS_URL=redis://localhost:6379 \
JWT_ACCESS_SECRET=dev-access-secret-please-change-me-32c \
JWT_REFRESH_SECRET=dev-refresh-secret-please-change-me-32c \
npm run dev --workspace=@agendia/api

# 5. Web (outro terminal)
NEXT_PUBLIC_API_URL=http://localhost:3001 npm run dev --workspace=@agendia/web
```

Scripts disponíveis na raiz (fan-out para workspaces):

```bash
npm run dev         # nest start --watch + next dev
npm run build       # contracts (tsc) + nest build + next build
npm run lint        # eslint em api e web
npm run typecheck   # tsc --noEmit em api, web e contracts
npm run test        # jest unit (api)
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

Principais variáveis (ver `.env.example`):

| Variável                  | Obrigatória | Default                 | Descrição                                                                    |
| ------------------------- | ----------- | ----------------------- | ---------------------------------------------------------------------------- |
| `DATABASE_URL`            | sim         | —                       | Connection string Postgres                                                   |
| `REDIS_URL`               | sim         | —                       | URL Redis                                                                    |
| `JWT_ACCESS_SECRET`       | sim         | —                       | ≥ 32 chars, valida na boot                                                   |
| `JWT_ACCESS_EXPIRES_IN`   | não         | `15m`                   | Formato `ms` (`15m`, `1h`, `7d`)                                             |
| `JWT_REFRESH_SECRET`      | sim         | —                       | ≥ 32 chars                                                                   |
| `JWT_REFRESH_EXPIRES_IN`  | não         | `7d`                    | Tempo de vida do refresh                                                     |
| `BCRYPT_SALT_ROUNDS`      | não         | `12`                    | Cost factor bcrypt                                                           |
| `EXAMS_CACHE_TTL_SECONDS` | não         | `300`                   | TTL cache Redis da listagem                                                  |
| `API_PORT`                | não         | `3001`                  | Porta da API dentro do container                                             |
| `API_HOST_PORT`           | não         | `3001`                  | Porta exposta no host pelo compose                                           |
| `WEB_PORT`                | não         | `3000`                  | Porta do Next.js dentro do container                                         |
| `WEB_HOST_PORT`           | não         | `3000`                  | Porta exposta no host pelo compose                                           |
| `POSTGRES_HOST_PORT`      | não         | `5432`                  | Porta do Postgres exposta no host                                            |
| `REDIS_HOST_PORT`         | não         | `6379`                  | Porta do Redis exposta no host                                               |
| `NEXT_PUBLIC_API_URL`     | build-time  | `http://localhost:3001` | URL da API acessada pelo browser (bake no bundle)                            |
| `INTERNAL_API_URL`        | não         | `NEXT_PUBLIC_API_URL`   | URL da API usada pelo Next em SSR (ex.: `http://api:3001` dentro do compose) |

---

## Testes

### Unitários (50 testes — services e infra pura)

```bash
npm run test --workspace=@agendia/api            # jest
npm run test:cov --workspace=@agendia/api        # com coverage
```

Cobertura nas unidades-alvo:

| Arquivo                   | % Statements | % Branches |
| ------------------------- | ------------ | ---------- |
| `appointments.service.ts` | 100 %        | 92 %       |
| `auth.service.ts`         | 100 %        | 83 %       |
| `users.service.ts`        | 97 %         | 90 %       |
| `exams.service.ts`        | 100 %        | 87 %       |
| `zod-validation.pipe.ts`  | 100 %        | 100 %      |
| `password-hasher.ts`      | 100 %        | 75 %       |

Controllers/guards/modules/repositories ficam fora do escopo unit — são integração pura e são exercitados pela suíte e2e.

### End-to-end (38 testes — api de ponta a ponta)

Requisito: **Postgres e Redis rodando** (porta 5432/6379). Use `docker compose up postgres redis -d` se não estiverem no ar.

```bash
npm run test:e2e --workspace=@agendia/api
```

O que acontece no setup:

1. `global-setup.ts` faz `DROP + CREATE DATABASE agendia_test` e aplica as migrations do Drizzle.
2. Cada spec sobe um `AppModule` completo com `createTestApp()` (pipes globais iguais aos de produção; `ThrottlerGuard` é desligado em `NODE_ENV=test` para não atrapalhar a suíte).
3. `beforeEach` faz `TRUNCATE CASCADE` em `appointments / exams / users` — isolamento puro entre testes.
4. `maxWorkers=1` garante que não haja concorrência no banco compartilhado.

Suites:

| Spec                       | Testes | Cobertura                                                                                                                         |
| -------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `auth.e2e-spec.ts`         | 11     | register (sucesso, senha fraca, nome curto, email duplicado), login, refresh (válido/ inválido / usuário removido / body ausente) |
| `users.e2e-spec.ts`        | 9      | GET/PATCH/PUT/DELETE `/users/me` — cobre conflict, body vazio, senha atual errada, LGPD delete                                    |
| `appointments.e2e-spec.ts` | 11     | POST (futuro/passado/overlap/sem token), GET isolado por usuário, cancel (próprio/403/409/404)                                    |
| `exams.e2e-spec.ts`        | 6      | list paginada + meta, filtro search, page/limit, detail por id, 404                                                               |
| `app.e2e-spec.ts`          | 1      | health                                                                                                                            |

### Rodando tudo

```bash
npm run test --workspace=@agendia/api && \
npm run test:e2e --workspace=@agendia/api
```

---

## Pre-commit hooks (Husky + lint-staged)

Os hooks são registrados automaticamente pelo script `prepare` no primeiro `npm install`.

**`.husky/pre-commit`** → `npx lint-staged`

Executa apenas nos arquivos **staged** (rápido, 1-2 s):

| Padrão                     | Comando                                            |
| -------------------------- | -------------------------------------------------- |
| `apps/api/**/*.ts`         | `eslint --fix --config apps/api/eslint.config.mjs` |
| `apps/web/**/*.{ts,tsx}`   | `eslint --fix --config apps/web/eslint.config.mjs` |
| `packages/**/*.ts`         | `prettier --write`                                 |
| `*.{md,json,yml,yaml,css}` | `prettier --write`                                 |

- Auto-fix de formatação e regras simples é aplicado ao stage.
- Erros que não dão pra autofix (ex.: variável não usada, tipo quebrado) **bloqueiam o commit**.
- O `eslint-plugin-prettier` embute prettier no lint, então não há passo redundante em api/web.

**`.husky/pre-push`** → `npm run typecheck`

Roda `tsc --noEmit` nos três workspaces (api/web/contracts). Evita empurrar quebra de tipo trivial pro CI.

**Bypass consciente** (para WIP, hotfix):

```bash
git commit --no-verify
git push   --no-verify
```

> O CI permanece **autoritativo** — hooks locais são feedback rápido, não substituem a validação canônica no PR.

---

## CI

`.github/workflows/ci.yml` tem dois jobs encadeados:

1. **`quality`** — lint + typecheck + unit em todos os workspaces (após buildar `@agendia/contracts`, obrigatório pro typecheck resolver os `.d.ts`).
2. **`e2e`** — depende de `quality`; sobe `postgres:16-alpine` e `redis:7-alpine` como services containers do GitHub Actions (grátis em conta pública / dentro dos 2000 min/mês em repo privado).

Env injetadas para o e2e replicam o setup local: `TEST_POSTGRES_HOST=localhost`, `TEST_POSTGRES_PORT=5432`, `REDIS_URL=redis://localhost:6379`.

---

## Decisões técnicas

### Arquitetura

- **Monorepo com npm workspaces** (`apps/*`, `packages/*`). Zero pré-requisito para o reviewer; suficiente para a escala atual.
- **NestJS modular** — um módulo por agregado (`users`, `auth`, `exams`, `appointments`, `health`) mais módulos transversais (`config`, `cache`, `db`). Nenhum feature module importa outro desnecessariamente.
- **Padrão Repository por agregado** (DIP): services dependem de repositórios nomeados, não do Drizzle cru. Facilita mock em teste e troca futura de ORM.
- **`DatabaseModule` global** com provider `DRIZZLE` (Symbol) e cleanup em `OnApplicationShutdown` — pool termina ao receber SIGTERM.

### Single Source of Truth para validação (`@agendia/contracts`)

- Workspace novo que exporta schemas Zod compartilhados (`nameSchema`, `emailSchema`, `passwordSchema`, `registerSchema`, `loginSchema`, `updateProfileSchema`, `changePasswordSchema`, `refreshSchema`).
- **Frontend** consome direto via `@/lib/validators/auth` (re-export) + `zodResolver` do React Hook Form.
- **Backend** aplica o mesmo schema via `ZodValidationPipe` custom (~20 linhas) nos controllers (`@Body(new ZodValidationPipe(schema))`).
- Mudar regra ⇒ edição em um único arquivo. Zero drift entre cliente e servidor.
- DTOs específicos de backend (ex.: `CreateAppointmentDto`, `AppointmentsQueryDto`) que não têm correspondente no front continuam em class-validator — consistência é secundária a escopo.

### Autenticação

- **Access token + refresh token** (JWTs com secrets separados, validados ≥32 chars).
- **Auto-refresh no ApiClient**: em 401, tenta `/auth/refresh` uma vez (com dedupe por `Promise` cacheado), retenta o request original. Falha ⇒ dispara `SessionGuard` que limpa estado, mostra toast e redireciona a `/login?from=<path>`.
- **`JwtStrategy.validate`** re-busca o usuário a cada request — token de conta deletada perde acesso imediatamente.
- **Anti-account-enumeration**: login retorna o mesmo `401 "Invalid credentials"` para email inexistente e senha errada.
- **`PasswordHasher` abstrato**: bcrypt encapsulado — services não importam a lib direta. Troca futura (argon2/scrypt) é uma linha.
- **Senha forte obrigatória no registro/troca**: 8-128 chars, maiúscula, minúscula, dígito, caractere especial. Validado no zod (SSOT).
- **Cookies `agendia_access_token` e `agendia_refresh_token`** (`SameSite=Lax`, `Secure` em HTTPS). Não-httpOnly por limite de Next.js App Router consumindo a API diretamente do browser — trade-off aceito e documentado nos próximos passos.

### Proteção de rotas no Next.js 16

- **`src/proxy.ts`** (convenção nova do Next 16, substitui o `middleware.ts`) intercepta `/appointments/:path*` e `/profile/:path*`. Sem cookie de refresh ⇒ redirect para `/login?from=<pathname>`.
- **`SessionGuard` cliente** (no `Providers`) escuta `onSessionExpired()` (pub-sub em `lib/auth/session-events.ts`) e centraliza a reação à perda de sessão (toast + redirect + cache clear).

### Dados

- **Drizzle ORM + `postgres` driver**: leve, SQL-like, tipagem inferida do schema (`$inferSelect`/`$inferInsert`), sem engine runtime.
- **Schema em arquivos por tabela** (`users.ts`, `exams.ts`, `appointments.ts`) + barrel.
- **Money como `integer priceCents`**: evita floats em aritmética monetária; nome explícito sobre a unidade.
- **Cascade `users → appointments`**: deletar conta remove agendamentos automaticamente (LGPD).
- **Índice único composto `(user_id, scheduled_at)`**: rede de segurança no banco contra double-booking exato.
- **Conflict detection por overlap real**: `innerJoin` com `exams` + `make_interval(mins => duration_min)` — calcula `[start, start + duration)` usando a duração de cada appointment existente. `sql` raw recebe `start.toISOString()` (evita serialização JS `Date.toString` incompatível com Postgres).
- **Seed idempotente** com `onConflictDoUpdate` — rebuild não duplica user demo, mas resseta a senha forte.

### Cache

- **Redis via `@keyv/redis`** registrado em `CacheModule` global.
- Apenas `GET /exams` usa `@UseInterceptors(CacheInterceptor)` — detalhe fica sem cache para priorizar freshness.
- **TTL configurável** (`EXAMS_CACHE_TTL_SECONDS`, default 5 min).

### Front-end

- **App Router** com `generateMetadata` server-side em `/exams/[id]` — SEO real (title, description, og:\*), fetch cacheado por 5 min (`next: { revalidate: 300 }`).
- **Estado de auth no React Query** (`AUTH_QUERY_KEY = ['auth', 'me']`): login publica via `setQueryData` → todos os subscribers atualizam em um tick.
- **Hooks especializados** (SRP): `useAuth` só lê; `useLogout` executa (com overload `logout`/`logoutSilent`); `useProfile` / `useUpdateProfile` / `useChangePassword` / `useDeleteAccount` encapsulam mutações com invalidação de cache.
- **URL como source of truth em `/exams`**: `?search=&page=` sobrevive a refresh, back/forward e compartilhamento.
- **Retry inteligente**: 4xx nunca retenta; 5xx retenta 1x; mutations nunca retentam.
- **Form validation**: Zod (SSOT) + `@hookform/resolvers/zod`. Tipo do form vem de `z.infer` — lockstep runtime/compile-time.
- **`<dialog>` nativo** para booking, confirmação de cancelamento e confirmação de LGPD delete — focus trap, ESC, backdrop e scroll lock vindos da plataforma.

### UX / A11y

- **Skeletons mimetizam o layout real** (sem paint-shift).
- **5 estados explícitos** por screen: loading, error (com retry), empty (com CTA), populated, fetching.
- **Status badges table-driven** (`STATUS_META` record) — novo status vira uma linha, zero branching (OCP).
- **LGPD delete** exige digitar `EXCLUIR` num dialog de confirmação antes de ficar clicável.
- **`<time dateTime={iso}>`**, `role="alert"` em erros, `aria-live="polite"` em contadores, `aria-current="page"` em nav ativo, `aria-invalid`/`aria-describedby` em inputs.
- **`autoComplete`/`inputMode` adequados** em todos os forms.
- **Loading state em botões** (`aria-busy`, texto "Entrando..." / "Confirmando...").

### Qualidade

- **88 testes automatizados** (50 unit + 38 e2e). E2e rodam contra Postgres + Redis reais, dentro de `agendia_test` separado do banco de dev, com cleanup por `TRUNCATE CASCADE` entre testes.
- **Exception filter global** produz envelope padronizado (`{statusCode, error, message, timestamp, path}`) — monitoramento tem um único contrato para ingerir.
- **ZodValidationPipe** devolve mensagens anotadas por path (`"password: Inclua ao menos uma letra maiúscula"`).
- **Hooks locais** (Husky + lint-staged): autofix nos staged files antes do commit, typecheck antes do push.
- **CI** com services: pós-quality, sobe postgres+redis e roda toda a suíte e2e de ponta a ponta.

---

## Diferenciais implementados

- **Swagger/OpenAPI** em `/docs` (UI com `Authorize` persistindo token).
- **Tokens em cookies httpOnly** (`agendia_access_token` / `agendia_refresh_token`, `SameSite=Lax`, `Secure` em prod). JS do browser não lê tokens — defesa contra XSS. Proxy Next 16 lê por ser server-side.
- **Refresh tokens persistidos** com **rotação em cada uso** (sha256 + `expires_at` + `revoked_at` no Postgres) e **defesa contra replay**: reuso de refresh já revogado revoga toda a família do usuário.
- **Auto-refresh transparente no cliente** (dedupe via promise cacheada); `SessionGuard` centraliza recovery de sessão expirada.
- **`@agendia/contracts`** — SSOT Zod compartilhado, consumido diretamente no web e via pipe no back.
- **Senha forte obrigatória** (upper/lower/digit/special + 8-128 chars) aplicada tanto no front quanto no back. Troca de senha revoga todas as sessões do usuário.
- **LGPD**: `DELETE /users/me` remove a conta e cascateia agendamentos + refresh tokens; UI exige confirmação explícita digitando `EXCLUIR`. **Export** via `GET /users/me/export` (botão "Baixar meus dados" no perfil).
- **Cancelamento de agendamento** com regras (ownership, status, futuro) e UI consistente (dialog nativo + loading).
- **Rate limiting distribuído** com `@nestjs/throttler` + `RedisThrottlerStorage` próprio (ioredis). Compartilha contador entre réplicas (scale horizontal). Limites: 60/min global, `/auth/login` 5/min, `/auth/register` 10/h, `/auth/refresh` 30/min.
- **SEO** — meta tags dinâmicas via `generateMetadata` em `/exams/[id]` (title, description, openGraph).
- **CI completo** — quality (lint+typecheck+unit) + e2e com services PG/Redis em GitHub Actions Free.
- **Hooks locais** — pre-commit (lint-staged) + pre-push (typecheck).
- **GitFlow** com commits atômicos (Conventional Commits) — veja `git log --oneline`.

---

## Trade-offs e próximos passos

Itens deixados fora do escopo atual, com caminho de evolução claro:

1. **Coverage em features do front** — Vitest + Testing Library para `useLogin`/`useRegister`/`useProfile`/booking e cancel flows. Backend já tem 111 testes (61 unit + 50 e2e).

2. **Validação do token na edge** — o proxy atual só checa presença do cookie de refresh. Validar assinatura na edge exige `jose` (compatível com Edge Runtime) — corta requests de tokens expirados antes de chegar à API.

3. **Observability** — logs estruturados (pino), métricas prometheus, trace OpenTelemetry. Infra pronta, só falta plugar.

4. **Cache invalidation em mutações** — quando houver endpoints de escrita em `/exams`, usar `CACHE_MANAGER` provider global.

5. **CSP estrito no Next** — hoje só headers básicos (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `HSTS`). Faltaria uma `Content-Security-Policy` ativa, o que exige auditar os bundles do Next (inline scripts de hidratação) e possivelmente nonces por render. Gera retorno real só em produção sob domínio dedicado.

6. **Marcar sessão atual na lista de "Sessões ativas"** — hoje todas as sessões aparecem iguais. Bastaria o backend incluir um flag `current: boolean` comparando o hash do cookie da request com cada row — ajudaria o usuário a não se auto-deslogar por engano.

7. **Notificação de login suspeito** — comparar IP/UA do login com o histórico de `refresh_tokens`; se divergente, enviar email de alerta (ou WebAuthn step-up). Requer serviço de email plugado.

8. **Audit log persistido** — hoje `refresh_tokens.last_used_at` só registra a última rotação. Um log append-only (`auth_events`: login-success/fail, password-change, session-revoked, account-deleted) facilitaria forense e compliance.

---

## GitFlow e commits

- `main` — base estável.
- Features em branches curtas (omitido aqui por ser single-contributor).
- Conventional Commits: `feat(api):`, `feat(web):`, `chore(docker):`, `test(api):`, `refactor(web):`, `ci:`, `docs:`.
- Cada commit é atômico e descreve o **por quê** (não apenas o "o quê") — `git log` deve ler-se como uma narrativa da implementação.

---

## Licença

MIT — ver [LICENSE](./LICENSE).
