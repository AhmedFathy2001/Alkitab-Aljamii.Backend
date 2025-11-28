import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

// Configurable quotas (could be moved to config/env)
const QUOTAS = {
  // Maximum unique content accesses per user per day
  DAILY_CONTENT_LIMIT: 50,
  // Maximum total streams per user per day
  DAILY_STREAM_LIMIT: 100,
  // Maximum streams per content per user per day
  PER_CONTENT_DAILY_LIMIT: 10,
};

export interface AccessLogOptions {
  contentId: string;
  userId: string;
  action: 'view' | 'stream' | 'download';
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export interface QuotaStatus {
  allowed: boolean;
  reason?: string;
  dailyStreams: number;
  dailyLimit: number;
  contentStreamsToday: number;
  contentLimit: number;
}

@Injectable()
export class ContentAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if user is within quota limits
   */
  async checkQuota(userId: string, contentId: string): Promise<QuotaStatus> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Count total streams today
    const dailyStreams = await this.prisma.contentAccessLog.count({
      where: {
        accessedById: userId,
        action: 'stream',
        accessedAt: { gte: startOfDay },
      },
    });

    // Count streams for this specific content today
    const contentStreamsToday = await this.prisma.contentAccessLog.count({
      where: {
        accessedById: userId,
        contentId,
        action: 'stream',
        accessedAt: { gte: startOfDay },
      },
    });

    if (dailyStreams >= QUOTAS.DAILY_STREAM_LIMIT) {
      return {
        allowed: false,
        reason: `Daily stream limit reached (${QUOTAS.DAILY_STREAM_LIMIT})`,
        dailyStreams,
        dailyLimit: QUOTAS.DAILY_STREAM_LIMIT,
        contentStreamsToday,
        contentLimit: QUOTAS.PER_CONTENT_DAILY_LIMIT,
      };
    }

    if (contentStreamsToday >= QUOTAS.PER_CONTENT_DAILY_LIMIT) {
      return {
        allowed: false,
        reason: `Per-content daily limit reached (${QUOTAS.PER_CONTENT_DAILY_LIMIT})`,
        dailyStreams,
        dailyLimit: QUOTAS.DAILY_STREAM_LIMIT,
        contentStreamsToday,
        contentLimit: QUOTAS.PER_CONTENT_DAILY_LIMIT,
      };
    }

    return {
      allowed: true,
      dailyStreams,
      dailyLimit: QUOTAS.DAILY_STREAM_LIMIT,
      contentStreamsToday,
      contentLimit: QUOTAS.PER_CONTENT_DAILY_LIMIT,
    };
  }

  /**
   * Assert quota is not exceeded, throw if it is
   */
  async assertWithinQuota(userId: string, contentId: string): Promise<void> {
    const quota = await this.checkQuota(userId, contentId);
    if (!quota.allowed) {
      throw new ForbiddenException(quota.reason);
    }
  }

  /**
   * Log a content access
   */
  async logAccess(options: AccessLogOptions): Promise<void> {
    await this.prisma.contentAccessLog.create({
      data: {
        contentId: options.contentId,
        accessedById: options.userId,
        action: options.action,
        ipAddress: options.ipAddress ?? null,
        userAgent: options.userAgent ?? null,
      },
    });
  }

  /**
   * Get user's access statistics
   */
  async getUserStats(userId: string): Promise<{
    totalAccesses: number;
    todayAccesses: number;
    uniqueContents: number;
  }> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [totalAccesses, todayAccesses, uniqueContents] = await Promise.all([
      this.prisma.contentAccessLog.count({
        where: { accessedById: userId },
      }),
      this.prisma.contentAccessLog.count({
        where: {
          accessedById: userId,
          accessedAt: { gte: startOfDay },
        },
      }),
      this.prisma.contentAccessLog.groupBy({
        by: ['contentId'],
        where: { accessedById: userId },
      }),
    ]);

    return {
      totalAccesses,
      todayAccesses,
      uniqueContents: uniqueContents.length,
    };
  }

  /**
   * Get content access statistics
   */
  async getContentStats(contentId: string): Promise<{
    totalAccesses: number;
    uniqueUsers: number;
    todayAccesses: number;
  }> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [totalAccesses, uniqueUsers, todayAccesses] = await Promise.all([
      this.prisma.contentAccessLog.count({
        where: { contentId },
      }),
      this.prisma.contentAccessLog.groupBy({
        by: ['accessedById'],
        where: { contentId },
      }),
      this.prisma.contentAccessLog.count({
        where: {
          contentId,
          accessedAt: { gte: startOfDay },
        },
      }),
    ]);

    return {
      totalAccesses,
      uniqueUsers: uniqueUsers.length,
      todayAccesses,
    };
  }
}
