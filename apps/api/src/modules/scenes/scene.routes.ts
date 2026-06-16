import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler.util.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { sendSuccess, sendPaginated } from '../../utils/response.util.js';
import { createSceneSchema, updateSceneSchema, sceneQuerySchema } from './scene.validator.js';
import { sceneService } from './scene.service.js';
import type { AuthenticatedRequest } from '../../types/index.js';

const router = Router();

router.use(authenticate as never);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { user } = req as AuthenticatedRequest;
    const query = sceneQuerySchema.parse(req.query);
    const { scenes, total } = await sceneService.listForUser(user.sub, query);
    sendPaginated(res, scenes, total, query.page, query.limit);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { user } = req as AuthenticatedRequest;
    const scene = await sceneService.getById(req.params.id, user.sub);
    sendSuccess(res, scene);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { user } = req as AuthenticatedRequest;
    const dto = createSceneSchema.parse(req.body);
    const scene = await sceneService.create(user.sub, dto);
    sendSuccess(res, scene, 201);
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { user } = req as AuthenticatedRequest;
    const dto = updateSceneSchema.parse(req.body);
    const scene = await sceneService.update(req.params.id, user.sub, dto);
    sendSuccess(res, scene);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { user } = req as AuthenticatedRequest;
    await sceneService.delete(req.params.id, user.sub);
    sendSuccess(res, null, 200, 'Scene deleted');
  }),
);

export default router;
