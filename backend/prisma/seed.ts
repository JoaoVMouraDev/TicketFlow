import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Credenciais deste seed existem apenas para desenvolvimento local. Nunca use,
// mantenha ou reaproveite estas contas e senhas em um ambiente de producao.

const prisma = new PrismaClient();

const Role = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

const TicketStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
} as const;

const Priority = {
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

const Category = {
  HARDWARE: 'HARDWARE',
  ACCESS: 'ACCESS',
  NETWORK: 'NETWORK',
} as const;

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed de desenvolvimento não pode rodar em produção');
  }

  const password = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ticketflow.dev' },
    update: {},
    create: {
      name: 'Admin Local',
      email: 'admin@ticketflow.dev',
      password,
      role: Role.ADMIN,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'usuario@ticketflow.dev' },
    update: {},
    create: {
      name: 'Usuario Demo',
      email: 'usuario@ticketflow.dev',
      password,
      role: Role.USER,
    },
  });

  const existingTickets = await prisma.ticket.count();

  if (existingTickets === 0) {
    await prisma.ticket.createMany({
      data: [
        {
          title: 'Notebook reiniciando durante reunioes',
          description:
            'O equipamento reinicia sozinho quando abre Meet e planilhas ao mesmo tempo.',
          status: TicketStatus.OPEN,
          priority: Priority.URGENT,
          category: Category.HARDWARE,
          createdById: user.id,
        },
        {
          title: 'Acesso bloqueado ao painel financeiro',
          description: 'Usuario autentica, mas o painel mostra permissao insuficiente.',
          status: TicketStatus.IN_PROGRESS,
          priority: Priority.HIGH,
          category: Category.ACCESS,
          createdById: user.id,
        },
        {
          title: 'Impressora nao aparece na rede',
          description: 'A impressora compartilhada sumiu depois da troca do roteador.',
          status: TicketStatus.OPEN,
          priority: Priority.MEDIUM,
          category: Category.NETWORK,
          createdById: admin.id,
        },
      ],
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
