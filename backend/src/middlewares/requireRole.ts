import type { NextFunction, Request, Response } from 'express';

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Você não tem permissão para esta ação' });
    }

    return next();
  };
}
