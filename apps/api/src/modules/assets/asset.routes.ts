import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler.util.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { sendSuccess, sendPaginated } from '../../utils/response.util.js';
import { createAssetSchema, updateAssetSchema, assetQuerySchema } from './asset.validator.js';
import { assetService } from './asset.service.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = assetQuerySchema.parse(req.query);
    const { assets, total } = await assetService.list(query);
    sendPaginated(res, assets, total, query.page, query.limit);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const asset = await assetService.getById(req.params.id);
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
    const asset = await assetService.update(req.params.id, dto);
    sendSuccess(res, asset);
  }),
);

router.delete(
  '/:id',
  authenticate as never,
  authorize('ADMIN') as never,
  asyncHandler(async (req, res) => {
    await assetService.delete(req.params.id);
    sendSuccess(res, null, 200, 'Asset deleted');
  }),
);

export default router;
