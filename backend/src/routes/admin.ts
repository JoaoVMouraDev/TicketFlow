import { Router } from 'express';
import { z } from 'zod';
import { paginationMeta, paginationSchema } from '../lib/pagination.js';
import { hashPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../middlewares/requireRole.js';

export const adminRouter = Router();

const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(6),
  role: z.enum(['USER', 'TECHNICIAN', 'ADMIN']).default('USER'),
});

const listUsersSchema = paginationSchema.extend({
  role: z.enum(['USER', 'TECHNICIAN', 'ADMIN']).optional(),
});

adminRouter.get('/users', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const query = listUsersSchema.parse(req.query);
    const where = { role: query.role };
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          _count: { select: { tickets: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({ users, pagination: paginationMeta(query.page, query.limit, total) });
  } catch (error) {
    return next(error);
  }
});

adminRouter.post('/users', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);
    const password = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: { ...data, password },
      select: { id: true, name: true, email: true, role: true },
    });

    return res.status(201).json({ user });
  } catch (error) {
    return next(error);
  }
});
