# TicketFlow

Sistema web para abertura, acompanhamento e atendimento de chamados internos. O TicketFlow reúne uma fila paginada de solicitações, métricas operacionais, histórico de comentários, controle de status e uma área administrativa para consulta de usuários.

## Funcionalidades

- Autenticação com email e senha usando JWT.
- Sessão protegida e encerramento com limpeza do cache local.
- Fila de chamados com paginação, busca e filtros por status.
- Criação de chamados com categoria e prioridade.
- Painel de detalhes com histórico e comentários.
- Alteração de status com regras de autorização.
- Métricas de chamados abertos, em andamento e resolvidos.
- Listagem administrativa de usuários com filtro por função.
- Interface responsiva com estados de carregamento, erro e lista vazia.

## Tecnologias

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- TanStack Query
- Lucide React
- CSS responsivo

### Backend

- Node.js
- Express
- TypeScript
- Prisma ORM
- SQLite para desenvolvimento local
- Zod
- JWT
- bcrypt
- Helmet
- Express Rate Limit

## Arquitetura

O repositório contém frontend e backend no mesmo projeto:

```text
ticketflow/
├── src/                    # Aplicação React
│   ├── components/         # Componentes compartilhados
│   ├── hooks/              # Hooks de autenticação e dados
│   ├── lib/                # Cliente HTTP e labels
│   └── pages/              # Login, chamados e usuários
├── public/                 # Arquivos públicos
├── backend/
│   ├── prisma/             # Schema, migrations e seed
│   └── src/
│       ├── lib/            # Prisma, JWT, senha e paginação
│       ├── middlewares/    # Autenticação, autorização e erros
│       └── routes/         # Auth, chamados e administração
└── README.md
```

O frontend roda em `http://127.0.0.1:5177` e a API em `http://localhost:3333` durante o desenvolvimento.

## Pré-requisitos

- Node.js 20 ou superior
- npm

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/JoaoVMouraDev/TicketFlow.git
cd TicketFlow
```

### 2. Configure e inicie o backend

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

No PowerShell, use `Copy-Item .env.example .env` no lugar de `cp`.

### 3. Inicie o frontend

Em outro terminal:

```bash
cd TicketFlow
npm install
npm run dev -- --host 127.0.0.1 --port 5177
```

Acesse `http://127.0.0.1:5177/login`.

## Variáveis de ambiente

Crie `backend/.env` a partir de `backend/.env.example`:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="troque-essa-chave-em-producao"
PORT=3333
FRONTEND_URL="http://127.0.0.1:5177"
```

Substitua `JWT_SECRET` por uma chave forte com pelo menos 16 caracteres. O servidor recusa a inicialização quando a chave é ausente, curta ou igual ao placeholder.

Arquivos `.env` e bancos locais são ignorados pelo Git e nunca devem ser publicados.

## Credenciais locais de demonstração

O seed cria as contas abaixo com a senha `123456`:

```text
Administrador: admin@ticketflow.dev
Usuário:       usuario@ticketflow.dev
Senha:         123456
```

> **Atenção:** essas credenciais existem exclusivamente para desenvolvimento local. Troque todas as senhas e remova contas de demonstração antes de qualquer deploy público ou uso real.

## Scripts

### Frontend

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o Vite em desenvolvimento |
| `npm run build` | Valida o TypeScript e gera o build |
| `npm run preview` | Visualiza o build localmente |

### Backend

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia a API com recarregamento automático |
| `npm run build` | Compila o TypeScript |
| `npm start` | Executa a API compilada |
| `npm run prisma:generate` | Gera o Prisma Client |
| `npm run prisma:migrate` | Aplica migrations em desenvolvimento |
| `npm run prisma:studio` | Abre o Prisma Studio |
| `npm run seed` | Cria dados locais de demonstração |

## API

Todas as rotas de chamados exigem `Authorization: Bearer <token>`.

### Autenticação

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/auth/register` | Cria uma conta pela API |
| `POST` | `/auth/login` | Autentica e retorna JWT |
| `GET` | `/auth/me` | Retorna o usuário autenticado |

O login aceita no máximo cinco tentativas por IP a cada 15 minutos.

### Chamados

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/tickets` | Lista chamados com paginação e filtros |
| `POST` | `/tickets` | Cria um chamado |
| `GET` | `/tickets/:id` | Exibe detalhes e comentários |
| `PATCH` | `/tickets/:id` | Atualiza chamado e status |
| `POST` | `/tickets/:id/comments` | Adiciona comentário |

Parâmetros disponíveis em `GET /tickets`:

```text
page, limit, status, priority, search
```

### Administração

As rotas abaixo exigem função `ADMIN`:

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/admin/users` | Lista usuários com paginação e filtro por função |
| `POST` | `/admin/users` | Cria um usuário sem alterar a sessão do admin |

## Valores de domínio

- Status: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`
- Prioridade: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- Categoria: `SOFTWARE`, `HARDWARE`, `FINANCE`, `NETWORK`, `ACCESS`, `OTHER`
- Função: `USER`, `TECHNICIAN`, `ADMIN`

## Segurança

- Senhas armazenadas somente como hash bcrypt.
- JWT validado em middleware centralizado.
- Autorização por função e propriedade do chamado.
- Helmet habilitado com configuração padrão.
- Rate limit aplicado ao login.
- Validação de entrada com Zod.
- Tratamento centralizado de erros do Prisma.
- `.env`, SQLite, builds e dependências protegidos pelo `.gitignore`.
- 
```

O banco `backend/prisma/dev.db` e o arquivo `backend/.env` são locais e não fazem parte do repositório.
