import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler.util';
import { authenticate } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response.util';
import { registerSchema, loginSchema, refreshSchema } from './auth.validator';
import { authService } from './auth.service';
import type { AuthenticatedRequest } from '../../types/index';

const router = Router();

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const dto = registerSchema.parse(req.body);
    const user = await authService.register(dto);
    sendSuccess(res, user, 201, 'Registration successful');
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const dto = loginSchema.parse(req.body);
    const tokens = await authService.login(dto);
    sendSuccess(res, tokens);
  }),
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens = await authService.refresh(refreshToken);
    sendSuccess(res, tokens);
  }),
);

router.post(
  '/logout',
  authenticate as never,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthenticatedRequest;
    await authService.logout(user.sub);
    sendSuccess(res, null, 200, 'Logged out');
  }),
);

router.get(
  '/me',
  authenticate as never,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthenticatedRequest;
    sendSuccess(res, user);
  }),
);

export default router;
