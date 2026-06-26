import path from 'path';
import fs from 'fs';
import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../utils/async-handler.util';
import { sendSuccess } from '../../utils/response.util';
import { config } from '../../config/index';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60);
    const name = `${base}_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (_req, file, cb) => {
    const ok = ['.glb', '.gltf'].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Only .glb and .gltf files are allowed') as any, ok);
  },
});

const router = Router();

router.post(
  '/glb',
  authenticate as never,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const file = (req as any).file;
    if (!file) throw new Error('No file received');

    // Build a public URL the browser can load
    const protocol = req.protocol;
    const host     = req.get('host') ?? 'localhost:3000';
    const url      = `${protocol}://${host}/uploads/${file.filename}`;

    sendSuccess(res, { url, filename: file.filename, size: file.size }, 201);
  }),
);

router.delete(
  '/glb/:filename',
  authenticate as never,
  asyncHandler(async (req, res) => {
    const filename = path.basename(req.params['filename'] as string); // prevent path traversal
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    sendSuccess(res, null, 200, 'Deleted');
  }),
);

export default router;
