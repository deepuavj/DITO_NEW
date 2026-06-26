import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler.util';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { sendSuccess, sendPaginated } from '../../utils/response.util';
import { createAssetSchema, updateAssetSchema, assetQuerySchema } from './asset.validator';
import { assetService } from './asset.service';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = assetQuerySchema.parse(req.query);
    // Admin requests (with auth token) see all assets; public sees only isPublic
    const isAdmin = (req as any).user?.role === 'ADMIN';
    const { assets, total } = isAdmin
      ? await assetService.listAll(query)
      : await assetService.list(query);
    sendPaginated(res, assets, total, query.page, query.limit);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const asset = await assetService.getById(req.params['id'] as string);
    sendSuccess(res, asset);
  }),
);

router.post(
  '/',
  authenticate as never,
  authorize('ADMIN') as never,
  asyncHandler(async (req, res) => {
    const dto = createAssetSchema.parse(req.body);
    const asset = await assetService.create(dto);
    sendSuccess(res, asset, 201);
  }),
);

router.patch(
  '/:id',
  authenticate as never,
  authorize('ADMIN') as never,
  asyncHandler(async (req, res) => {
    const dto = updateAssetSchema.parse(req.body);
    const asset = await assetService.update(req.params['id'] as string, dto);
    sendSuccess(res, asset);
  }),
);

router.delete(
  '/:id',
  authenticate as never,
  authorize('ADMIN') as never,
  asyncHandler(async (req, res) => {
    await assetService.delete(req.params['id'] as string);
    sendSuccess(res, null, 200, 'Asset deleted');
  }),
);

export default router;
