# Agendia

Portal de agendamento de exames para redes de laboratórios. Pacientes buscam exames disponíveis e reservam horários por meio de uma interface web integrada a uma API REST.

## Stack

- **Back-end:** NestJS · TypeScript · Drizzle ORM · PostgreSQL · Redis · JWT
- **Front-end:** Next.js 14+ (App Router) · TypeScript · Tailwind CSS · TanStack Query v5
- **Infra:** Docker Compose (api, web, postgres, redis)

## Estrutura

```
agendia/
├── apps/
│   ├── api/      # NestJS API
│   └── web/      # Next.js front-end
├── docs/         # Documentação e material do desafio
└── docker/       # Dockerfiles e recursos de infra
```

## Setup

Instruções de setup serão documentadas ao longo do desenvolvimento. O objetivo final é que o comando único abaixo suba todo o stack:

```bash
docker-compose up
```

## Documentação

- [Plano de execução](./docs/PLANO_EXECUCAO.md)

## Licença

MIT — ver [LICENSE](./LICENSE).
