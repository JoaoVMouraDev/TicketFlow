import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { paginationMeta, paginationSchema } from '../lib/pagination.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middlewares/auth.js';

export const ticketsRouter = Router();

ticketsRouter.use(requireAuth);

const ticketStatusValues = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
const priorityValues = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
const categoryValues = ['SOFTWARE', 'HARDWARE', 'FINANCE', 'NETWORK', 'ACCESS', 'OTHER'] as const;

type Category = (typeof categoryValues)[number];

const createTicketSchema = z.object({
  title: z.string().trim().min(3),
  description: z.string().trim().min(5),
  priority: z.enum(priorityValues).default('MEDIUM'),
  category: z.enum(categoryValues).default('SOFTWARE'),
});

const updateTicketSchema = z.object({
  title: z.string().trim().min(3).optional(),
  description: z.string().trim().min(5).optional(),
  status: z.enum(ticketStatusValues).optional(),
  priority: z.enum(priorityValues).optional(),
  category: z.enum(categoryValues).optional(),
});

const listTicketSchema = paginationSchema.extend({
  status: z.enum(ticketStatusValues).optional(),
  priority: z.enum(priorityValues).optional(),
  search: z.string().trim().optional(),
});

const categorySearchLabels: Record<Category, string[]> = {
  SOFTWARE: ['software', 'sistema', 'app'],
  HARDWARE: ['hardware', 'notebook', 'computador', 'equipamento'],
  FINANCE: ['financeiro', 'financa', 'finance'],
  NETWORK: ['rede', 'network', 'internet'],
  ACCESS: ['acesso', 'access', 'login', 'permissao'],
  OTHER: ['outro', 'other'],
};

function findCategoryBySearch(search?: string) {
  if (!search) {
    return undefined;
  }

  const normalizedSearch = search.toLowerCase();
  return Object.entries(categorySearchLabels).find(([, labels]) =>
    labels.some((label) => label.includes(normalizedSearch) || normalizedSearch.includes(label)),
  )?.[0] as Category | undefined;
}

ticketsRouter.get('/', async (req, res, next) => {
  try {
    const query = listTicketSchema.parse(req.query);
    const category = findCategoryBySearch(query.search);
    const where: Prisma.TicketWhereInput = {
      status: query.status,
      priority: query.priority,
      OR: query.search
        ? [
            { title: { contains: query.search } },
            { description: { contains: query.search } },
            { createdBy: { name: { contains: query.search } } },
            ...(category ? [{ category }] : []),
          ]
        : undefined,
    };

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.ticket.count({ where }),
    ]);

    return res.json({ tickets, pagination: paginationMeta(query.page, query.limit, total) });
  } catch (error) {
    return next(error);
  }
});

ticketsRouter.post('/', async (req, res, next) => {
  try {
    const data = createTicketSchema.parse(req.body);

    const ticket = await prisma.ticket.create({
      data: {
        ...data,
        createdById: req.user!.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
    });

    return res.status(201).json({ ticket });
  } catch (error) {
    return next(error);
  }
});

ticketsRouter.get('/:id', async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        comments: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Chamado nao encontrado' });
    }

    return res.json({ ticket });
  } catch (error) {
    return next(error);
  }
});

ticketsRouter.patch('/:id', async (req, res, next) => {
  try {
    const data = updateTicketSchema.parse(req.body);
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      select: { createdById: true },
    });

    if (!existingTicket) {
      return res.status(404).json({ message: 'Chamado nao encontrado' });
    }

    const user = req.user!;
    const canUpdate =
      existingTicket.createdById === user.id || user.role === 'TECHNICIAN' || user.role === 'ADMIN';

    if (!canUpdate) {
      return res.status(403).json({ message: 'Você não tem permissão para alterar este chamado' });
    }

    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
    });

    return res.json({ ticket });
  } catch (error) {
    return next(error);
  }
});

ticketsRouter.post('/:id/comments', async (req, res, next) => {
  try {
    const data = z.object({ message: z.string().trim().min(1) }).parse(req.body);

    const comment = await prisma.comment.create({
      data: {
        message: data.message,
        ticketId: req.params.id,
        userId: req.user!.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(201).json({ comment });
  } catch (error) {
    return next(error);
  }
});
