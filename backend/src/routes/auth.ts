import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { signToken } from '../lib/jwt.js';
import { hashPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middlewares/auth.js';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { message: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const password = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    const token = signToken({ userId: user.id });
    return res.status(201).json({ user, token });
  } catch (error) {
    return next(error);
  }
});

authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const userWithPassword = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!userWithPassword) {
      return res.status(401).json({ message: 'Email ou senha invalidos' });
    }

    const passwordMatches = await bcrypt.compare(data.password, userWithPassword.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Email ou senha invalidos' });
    }

    const user = {
      id: userWithPassword.id,
      name: userWithPassword.name,
      email: userWithPassword.email,
      role: userWithPassword.role,
    };

    const token = signToken({ userId: user.id });
    return res.json({ user, token });
  } catch (error) {
    return next(error);
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});
