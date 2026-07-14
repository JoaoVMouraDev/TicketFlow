# TicketFlow API

Backend inicial do TicketFlow com Express, Prisma, PostgreSQL, JWT, bcrypt e Zod.

## Rotas

```txt
POST /auth/register
POST /auth/login
GET  /auth/me

GET    /tickets
POST   /tickets
GET    /tickets/:id
PATCH  /tickets/:id
POST   /tickets/:id/comments
```

## Como rodar

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

Conta demo criada pelo seed:

```txt
admin@ticketflow.dev
123456
```

> **Aviso:** estas credenciais sao apenas exemplos para desenvolvimento local.
> Antes de qualquer deploy real, troque todas as senhas de exemplo antes de expor
> o aplicativo publicamente. Nunca reutilize estas credenciais em producao.
