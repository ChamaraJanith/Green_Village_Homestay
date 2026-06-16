import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { pool } from './db';

dotenv.config();

const app  = express();
const port = Number(process.env.PORT) || 4000;

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const JWT_SECRET     = process.env.JWT_SECRET    ?? 'fallback_secret_change_me';
const ADMIN_USER     = process.env.ADMIN_USERNAME ?? 'admin';
const ADMIN_PASS     = process.env.ADMIN_PASSWORD ?? 'greenvillage2024';
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'room-images';

app.disable('x-powered-by');
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// multer — keep file in memory, forward buffer to Supabase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ─── AUTH MIDDLEWARE ─────────────────────────────────────────────────────────

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    (req as Request & { admin: unknown }).admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── HEALTH ──────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/db-health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    res.json({ status: 'ok', database: 'connected', timestamp: result.rows[0]?.now });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ─── ADMIN AUTH ──────────────────────────────────────────────────────────────

app.post('/admin/login', (req: Request, res: Response): void => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) { res.status(400).json({ error: 'username and password are required' }); return; }
  if (username !== ADMIN_USER || password !== ADMIN_PASS) { res.status(401).json({ error: 'Invalid credentials' }); return; }
  const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// ─── ROOMS — PUBLIC ──────────────────────────────────────────────────────────

app.get('/rooms', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM rooms ORDER BY sort_order ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ─── ROOMS — ADMIN ───────────────────────────────────────────────────────────

app.get('/admin/rooms', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM rooms ORDER BY sort_order ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.put('/admin/rooms/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { tag, name, desc, features, price } = req.body as {
    tag?: string; name?: string; desc?: string; features?: string[]; price?: string;
  };
  if (!tag || !name || !desc || !features || !price) {
    res.status(400).json({ error: 'tag, name, desc, features and price are all required' }); return;
  }
  try {
    const { rows } = await pool.query(
      `UPDATE rooms SET tag=$1, name=$2, description=$3, features=$4, price=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [tag, name, desc, features, price, id]
    );
    if (rows.length === 0) { res.status(404).json({ error: 'Room not found' }); return; }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ─── IMAGE UPLOAD → LOCAL STORAGE ─────────────────────────────────────────

app.post(
  '/admin/rooms/:id/image',
  requireAuth,
  upload.single('image'),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const file   = req.file;
    if (!file) { res.status(400).json({ error: 'No image file provided' }); return; }

    const ext      = file.originalname.split('.').pop()?.toLowerCase() ?? 'jpg';
    const filename = `cover_${Date.now()}.${ext}`;
    const dirPath  = path.join(process.cwd(), 'uploads', id);
    const filePath = path.join(dirPath, filename);

    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(filePath, file.buffer);

      const host = req.protocol + '://' + req.get('host');
      const imageUrl = `${host}/uploads/${id}/${filename}`;

      const { rows } = await pool.query(
        `UPDATE rooms SET image_url=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
        [imageUrl, id]
      );
      if (rows.length === 0) { res.status(404).json({ error: 'Room not found' }); return; }

      console.log(`[image-upload] ✓ room ${id} → ${imageUrl}`);
      res.json({ image_url: imageUrl, room: rows[0] });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
);

app.delete('/admin/rooms/:id/image', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const { rows: current } = await pool.query('SELECT image_url FROM rooms WHERE id=$1', [id]);
    if (current.length === 0) { res.status(404).json({ error: 'Room not found' }); return; }

    const imageUrl: string | null = current[0].image_url;
    if (imageUrl && imageUrl.includes('/uploads/')) {
      const parts = imageUrl.split('/uploads/');
      if (parts.length > 1) {
        const localPath = path.join(process.cwd(), 'uploads', parts[1].split('?')[0]);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      }
    }

    const { rows } = await pool.query(
      `UPDATE rooms SET image_url=NULL, updated_at=NOW() WHERE id=$1 RETURNING *`, [id]
    );
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ─── INIT DB & START ─────────────────────────────────────────────────────────

async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id          SERIAL PRIMARY KEY,
      sort_order  INTEGER      NOT NULL DEFAULT 0,
      tag         VARCHAR(80)  NOT NULL DEFAULT '',
      name        VARCHAR(160) NOT NULL,
      description TEXT         NOT NULL DEFAULT '',
      features    TEXT[]       NOT NULL DEFAULT '{}',
      price       VARCHAR(80)  NOT NULL DEFAULT '',
      gradient    VARCHAR(160) NOT NULL DEFAULT '',
      accent      VARCHAR(20)  NOT NULL DEFAULT '#d9ff78',
      image_url   TEXT,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS image_url TEXT;`);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS cnt FROM rooms');
  if (rows[0].cnt === 0) {
    await pool.query(`
      INSERT INTO rooms (sort_order, tag, name, description, features, price, gradient, accent) VALUES
        (0,'Most Popular','Ella Rock Suite','Wake to a panoramic frame of Ella Rock directly from your private balcony. Double occupancy with king bed.',
         ARRAY['Private Balcony','Mountain View','Free Wi-Fi','En-suite Bath'],'From $45/night','from-emerald-900/60 to-green-950/80','#d9ff78'),
        (1,'Family Retreat','Garden Family Room','Spacious room for up to 6 guests surrounded by the lush homestay garden with private entrance.',
         ARRAY['Sleeps up to 6','Garden Access','Private Entrance','Shared Kitchen'],'From $85/night','from-teal-900/60 to-emerald-950/80','#78ffd6'),
        (2,'Best Value','Triple Hill View','Three guests, one breathtaking view. Generous layout with all the essentials for a memorable stay.',
         ARRAY['Sleeps 3','Hill Views','Daily Housekeeping','Breakfast Included'],'From $60/night','from-green-900/60 to-teal-950/80','#a8ff78');
    `);
    console.log('Seeded default rooms.');
  }
}

initDb()
  .then(() => app.listen(port, () => console.log(`Server running → http://localhost:${port}`)))
  .catch((err) => { console.error('DB init failed:', err); process.exit(1); });
