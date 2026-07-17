import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { requireAuth } from './middlewares/auth.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { ticketsRouter } from './routes/tickets.js';

export const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet());

const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.NODE_ENV !== 'production'
    ? ['http://localhost:5177', 'http://127.0.0.1:5177']
    : []),
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'));
    },
  }),
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ticketflow-api' });
});

app.use('/auth', authRouter);
app.use('/admin', requireAuth, adminRouter);
app.use('/tickets', ticketsRouter);

app.use(errorHandler);
