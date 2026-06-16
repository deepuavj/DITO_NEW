import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config } from './config/index.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import authRoutes from './modules/auth/auth.routes.js';
import assetRoutes from './modules/assets/asset.routes.js';
import sceneRoutes from './modules/scenes/scene.routes.js';

const app = express();

// ─── Security & Logging ──────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
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
