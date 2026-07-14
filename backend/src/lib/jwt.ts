import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET;

if (
  process.env.NODE_ENV !== 'test' &&
  (!jwtSecret || jwtSecret === 'troque-essa-chave-em-producao' || jwtSecret.length < 16)
) {
  throw new Error(
    'JWT_SECRET inseguro ou não configurado. Defina uma chave forte no .env antes de iniciar o servidor.',
  );
}

const JWT_SECRET = jwtSecret ?? 'test-only-secret';

export type JwtPayload = {
  userId: string;
};

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as unknown as JwtPayload;
}
