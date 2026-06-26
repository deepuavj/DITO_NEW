import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/async-handler.util';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response.util';
import { categoryService } from './category.service';

const router = Router();

const categorySchema = z.object({
  name:      z.string().min(1).max(100),
  icon:      z.string().optional().default('📦'),
  color:     z.string().optional().default('#6B7280'),
  sortOrder: z.number().int().optional().default(0),
});

// Public: list categories
router.get('/', asyncHandler(async (_req, res) => {
  const cats = await categoryService.list();
  sendSuccess(res, cats);
}));

// Admin only: create / update / delete
router.post('/', authenticate as never, authorize('ADMIN') as never,
  asyncHandler(async (req, res) => {
    const dto = categorySchema.parse(req.body);
    const cat = await categoryService.create(dto);
    sendSuccess(res, cat, 201);
  }),
);

router.patch('/:id', authenticate as never, authorize('ADMIN') as never,
  asyncHandler(async (req, res) => {
    const dto = categorySchema.partial().parse(req.body);
    const cat = await categoryService.update(req.params['id'] as string, dto);
    sendSuccess(res, cat);
  }),
);

router.delete('/:id', authenticate as never, authorize('ADMIN') as never,
  asyncHandler(async (req, res) => {
    await categoryService.delete(req.params['id'] as string);
    sendSuccess(res, null, 200, 'Category deleted');
  }),
);

export default router;
