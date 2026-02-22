import { Router } from 'express';
import { createHash } from 'crypto';
import multer from 'multer';
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { users, userProfiles, userSettings } from '@gratonite/db';
import { inArray } from 'drizzle-orm';
import { createDndService } from './dnd.service.js';
import type { AppContext } from '../../lib/context.js';
import { requireAuth } from '../../middleware/auth.js';
import { logger } from '../../lib/logger.js';
import { BUCKETS } from '../../lib/minio.js';
import { uploadRateLimiter } from '../../middleware/rate-limiter.js';

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: BUCKETS.avatars.maxSize },
});

const bannerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: BUCKETS.banners.maxSize },
});

export function usersRouter(ctx: AppContext): Router {
  const router = Router();
  const auth = requireAuth(ctx);
  const allowedPresenceStatuses = new Set(['online', 'idle', 'dnd', 'invisible']);

  // ── GET /api/v1/users (batch summary) ─────────────────────────────────
  // ids=comma-separated list of user IDs
  router.get('/', auth, async (req, res) => {
    try {
      const idsParam = String(req.query['ids'] ?? '').trim();
      if (!idsParam) {
        res.json([]);
        return;
      }
      const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length === 0) {
        res.json([]);
        return;
      }
      if (ids.length > 100) {
        res.status(400).json({ code: 'TOO_MANY_IDS', message: 'Max 100 ids per request' });
        return;
      }

      const bigintIds = ids.map((id) => BigInt(id));
      const rows = await ctx.db
        .select({
          id: users.id,
          username: users.username,
          displayName: userProfiles.displayName,
          avatarHash: userProfiles.avatarHash,
        })
        .from(users)
        .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
        .where(inArray(users.id, bigintIds));

      res.json(rows.map((row) => ({
        id: row.id.toString(),
        username: row.username,
        displayName: row.displayName,
        avatarHash: row.avatarHash,
      })));
    } catch (err) {
      logger.error({ err }, 'Error fetching user summaries');
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
  });

  // ── GET /api/v1/users/@me ──────────────────────────────────────────────
  // Returns the current authenticated user's profile
  router.get('/@me', requireAuth(ctx), async (req, res) => {
    try {
      const userId = BigInt(req.user!.userId);

      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        res.status(404).json({
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        });
        return;
      }

      const [profile] = await ctx.db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      const [settings] = await ctx.db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

      res.json({
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
        profile: profile
          ? {
              displayName: profile.displayName,
              avatarHash: profile.avatarHash,
              avatarAnimated: profile.avatarAnimated,
              bannerHash: profile.bannerHash,
              bannerAnimated: profile.bannerAnimated,
              accentColor: profile.accentColor,
              bio: profile.bio,
              pronouns: profile.pronouns,
              avatarDecorationId: profile.avatarDecorationId?.toString() ?? null,
              profileEffectId: profile.profileEffectId?.toString() ?? null,
              nameplateId: profile.nameplateId?.toString() ?? null,
              themePreference: profile.themePreference,
              tier: profile.tier,
            }
          : null,
        settings: settings
          ? {
              locale: settings.locale,
              theme: settings.theme,
              messageDisplay: settings.messageDisplay,
              reducedMotion: settings.reducedMotion,
              highContrast: settings.highContrast,
              fontScale: settings.fontScale,
              calmMode: settings.calmMode,
              developerMode: settings.developerMode,
            }
          : null,
      });
    } catch (err) {
      logger.error({ err }, 'Error fetching user profile');
      res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'An error occurred',
      });
    }
  });

  // ── GET /api/v1/users/presences (batch) ────────────────────────────────
  router.get('/presences', auth, async (req, res) => {
    try {
      const idsParam = String(req.query.ids ?? '').trim();
      if (!idsParam) return res.json([]);

      const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length === 0) return res.json([]);
      if (ids.length > 100) {
        return res.status(400).json({ code: 'TOO_MANY_IDS', message: 'Max 100 ids per request' });
      }

      const presences = await Promise.all(
        ids.map(async (userId) => {
          const [presence, isOnline] = await Promise.all([
            ctx.redis.hgetall(`presence:${userId}`),
            ctx.redis.sismember('online_users', userId),
          ]);
          const rawStatus = String(presence['status'] ?? '').trim();
          const status = rawStatus || (isOnline ? 'online' : 'offline');
          return {
            userId,
            status: status === 'invisible' ? 'offline' : status,
            lastSeen: presence['lastSeen'] ? Number(presence['lastSeen']) : null,
          };
        }),
      );

      res.json(presences);
    } catch (err) {
      logger.error({ err }, 'Error fetching presences');
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
  });

  // ── PATCH /api/v1/users/@me ────────────────────────────────────────────
  // Update current user's profile
  router.patch('/@me', requireAuth(ctx), async (req, res) => {
    try {
      const userId = BigInt(req.user!.userId);
      const { displayName, bio, pronouns, accentColor } = req.body;

      const updateData: Record<string, unknown> = {};
      if (displayName !== undefined) updateData.displayName = displayName;
      if (bio !== undefined) updateData.bio = bio;
      if (pronouns !== undefined) updateData.pronouns = pronouns;
      if (accentColor !== undefined) updateData.accentColor = accentColor;

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          code: 'NO_CHANGES',
          message: 'No valid fields to update',
        });
        return;
      }

      await ctx.db
        .update(userProfiles)
        .set(updateData)
        .where(eq(userProfiles.userId, userId));

      res.json({ success: true });
    } catch (err) {
      logger.error({ err }, 'Error updating user profile');
      res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'An error occurred',
      });
    }
  });

  // ── PATCH /api/v1/users/@me/settings ───────────────────────────────────
  // Update current user's settings
  router.patch('/@me/settings', requireAuth(ctx), async (req, res) => {
    try {
      const userId = BigInt(req.user!.userId);
      const allowedFields = [
        'locale',
        'theme',
        'messageDisplay',
        'reducedMotion',
        'highContrast',
        'fontScale',
        'saturation',
        'developerMode',
        'streamerMode',
        'calmMode',
        'allowDmsFrom',
        'allowGroupDmInvitesFrom',
        'allowFriendRequestsFrom',
      ];

      const updateData: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          code: 'NO_CHANGES',
          message: 'No valid fields to update',
        });
        return;
      }

      await ctx.db
        .update(userSettings)
        .set(updateData)
        .where(eq(userSettings.userId, userId));

      res.json({ success: true });
    } catch (err) {
      logger.error({ err }, 'Error updating user settings');
      res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'An error occurred',
      });
    }
  });

  // ── PATCH /api/v1/users/@me/presence ───────────────────────────────────
  router.patch('/@me/presence', auth, async (req, res) => {
    try {
      const status = String(req.body?.['status'] ?? '').trim();
      if (!allowedPresenceStatuses.has(status)) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid presence status' });
      }

      await ctx.redis.hset(`presence:${req.user!.userId}`, {
        status,
        lastSeen: Date.now().toString(),
      });

      res.json({ status });
    } catch (err) {
      logger.error({ err }, 'Error updating presence');
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
  });

  // ── Upload global avatar ───────────────────────────────────────────────
  router.post('/@me/avatar', auth, uploadRateLimiter, avatarUpload.single('file'), async (req, res) => {
    try {
      const userId = req.user!.userId;
      if (!req.file) {
        return res.status(400).json({ code: 'NO_FILE' });
      }

      const processed = await sharp(req.file.buffer)
        .rotate()
        .resize(1024, 1024, { fit: 'cover' })
        .webp({ quality: 85 })
        .toBuffer();

      const hash = createHash('sha256').update(processed).digest('hex').slice(0, 32);
      const key = `users/${userId}/${hash}.webp`;

      await ctx.minio.putObject(BUCKETS.avatars.name, key, processed, processed.length, {
        'Content-Type': 'image/webp',
      });

      await ctx.db
        .update(userProfiles)
        .set({ avatarHash: `${hash}.webp`, avatarAnimated: false })
        .where(eq(userProfiles.userId, BigInt(userId)));

      res.json({ avatarHash: `${hash}.webp`, avatarAnimated: false });
    } catch (err) {
      logger.error({ err }, 'Error uploading avatar');
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
  });

  // ── Remove global avatar ───────────────────────────────────────────────
  router.delete('/@me/avatar', auth, async (req, res) => {
    try {
      const userId = BigInt(req.user!.userId);
      await ctx.db
        .update(userProfiles)
        .set({ avatarHash: null, avatarAnimated: false })
        .where(eq(userProfiles.userId, userId));
      res.status(204).send();
    } catch (err) {
      logger.error({ err }, 'Error removing avatar');
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
  });

  // ── Upload global banner ───────────────────────────────────────────────
  router.post('/@me/banner', auth, uploadRateLimiter, bannerUpload.single('file'), async (req, res) => {
    try {
      const userId = req.user!.userId;
      if (!req.file) {
        return res.status(400).json({ code: 'NO_FILE' });
      }

      const processed = await sharp(req.file.buffer)
        .rotate()
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const hash = createHash('sha256').update(processed).digest('hex').slice(0, 32);
      const key = `users/${userId}/${hash}.webp`;

      await ctx.minio.putObject(BUCKETS.banners.name, key, processed, processed.length, {
        'Content-Type': 'image/webp',
      });

      await ctx.db
        .update(userProfiles)
        .set({ bannerHash: `${hash}.webp`, bannerAnimated: false })
        .where(eq(userProfiles.userId, BigInt(userId)));

      res.json({ bannerHash: `${hash}.webp`, bannerAnimated: false });
    } catch (err) {
      logger.error({ err }, 'Error uploading banner');
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
  });

  // ── Remove global banner ───────────────────────────────────────────────
  router.delete('/@me/banner', auth, async (req, res) => {
    try {
      const userId = BigInt(req.user!.userId);
      await ctx.db
        .update(userProfiles)
        .set({ bannerHash: null, bannerAnimated: false })
        .where(eq(userProfiles.userId, userId));
      res.status(204).send();
    } catch (err) {
      logger.error({ err }, 'Error removing banner');
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
  });

  // ── GET /api/v1/users/@me/dnd-schedule ──────────────────────────────────
  router.get('/@me/dnd-schedule', auth, async (req, res) => {
    try {
      const dndService = createDndService(ctx);
      const schedule = await dndService.getSchedule(req.user!.userId);
      res.json(schedule ?? {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC',
        daysOfWeek: 127,
        allowExceptions: [],
      });
    } catch (err) {
      logger.error({ err }, 'Error fetching DND schedule');
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
  });

  // ── PATCH /api/v1/users/@me/dnd-schedule ────────────────────────────────
  router.patch('/@me/dnd-schedule', auth, async (req, res) => {
    try {
      const allowedFields = ['enabled', 'startTime', 'endTime', 'timezone', 'daysOfWeek', 'allowExceptions'];
      const updateData: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ code: 'NO_CHANGES', message: 'No valid fields to update' });
      }
      const dndService = createDndService(ctx);
      const result = await dndService.updateSchedule(req.user!.userId, updateData as any);
      res.json(result);
    } catch (err) {
      logger.error({ err }, 'Error updating DND schedule');
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' });
    }
  });

  return router;
}
