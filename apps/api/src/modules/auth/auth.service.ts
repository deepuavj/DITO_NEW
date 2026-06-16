import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../middleware/error.middleware.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.util.js';
import type { RegisterDto, LoginDto } from './auth.validator.js';

const SALT_ROUNDS = 12;

export const authService = {
  async register(dto: RegisterDto) {
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new AppError('Email already in use', 409);

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    return user;
  },

  async login(dto: LoginDto) {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new AppError('Invalid credentials', 401);

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new AppError('Invalid credentials', 401);

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken({ sub: user.id });

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  },

  async refresh(token: string) {
    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new AppError('Refresh token invalid or expired', 401);
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.refreshToken !== token) {
      throw new AppError('Refresh token revoked', 401);
    }

    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ sub: user.id });

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    return { accessToken, refreshToken };
  },

  async logout(userId: string) {
    await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
  },
};
