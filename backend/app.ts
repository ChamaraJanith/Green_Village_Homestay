import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 4000;
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Backend server is running',
  });
});

app.get('/db-health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS now');

    res.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: result.rows[0]?.now,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';

    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      message,
    });
  }
});

app.get('/supabase-health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    supabase: 'configured',
    url: Boolean(process.env.SUPABASE_URL),
    anonKey: Boolean(process.env.SUPABASE_ANON_KEY),
    serviceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
