import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Dados invalidos',
      issues: error.issues,
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Registro ja existe' });
    }

    if (error.code === 'P2003') {
      return res.status(404).json({ message: 'Recurso relacionado não encontrado' });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Registro nao encontrado' });
    }
  }

  console.error(error);
  return res.status(500).json({ message: 'Erro interno do servidor' });
}
