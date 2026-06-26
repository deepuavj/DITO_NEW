import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config } from './config/index';
import { errorMiddleware } from './middleware/error.middleware';
import authRoutes from './modules/auth/auth.routes';
import assetRoutes from './modules/assets/asset.routes';
import categoryRoutes from './modules/categories/category.routes';
import sceneRoutes from './modules/scenes/scene.routes';

const app = express();

app.set('trust proxy', 1);

// ─── Security & Logging ──────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // same-origin / curl
    const allowed = [config.cors.origin, /\.app\.github\.dev$/];
    const ok = allowed.some(p => typeof p === 'string' ? p === origin : p.test(origin));
    cb(ok ? null : new Error('CORS'), ok);
  },
  credentials: true,
}));
app.use(morgan(config.isDev() ? 'dev' : 'combined'));

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/scenes', sceneRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Error Handling ───────────────────────────────────────────────────────────

app.use(errorMiddleware);

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(config.port, () => {
  console.log(`[DITO API] Running on http://localhost:${config.port} (${config.env})`);
});

export default app;
