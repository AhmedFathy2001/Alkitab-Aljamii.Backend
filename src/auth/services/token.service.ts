import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { RefreshToken } from '@prisma/client';
import type { JwtConfig } from '../../config/configuration.js';

@Injectable()
export class TokenService {
  private readonly jwtConfig: JwtConfig;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const config = this.configService.get<JwtConfig>('jwt');
    if (!config) {
      throw new Error('JWT configuration not found');
    }
    this.jwtConfig = config;
  }

  async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  }> {
    const expiresInSeconds = this.parseExpiryToSeconds(
      this.jwtConfig.accessExpiresIn,
    );
    const refreshExpiresInSeconds = this.parseExpiryToSeconds(
      this.jwtConfig.refreshExpiresIn,
    );

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, role },
      {
        secret: this.jwtConfig.accessSecret,
        expiresIn: expiresInSeconds,
      },
    );

    const refreshToken = uuidv4();

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSeconds,
      refreshExpiresIn: refreshExpiresInSeconds,
    };
  }

  async saveRefreshToken(
    userId: string,
    token: string,
    deviceInfo?: string | null,
  ): Promise<void> {
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = this.calculateExpiry(this.jwtConfig.refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        deviceInfo: deviceInfo ?? null,
      },
    });
  }

  async validateRefreshToken(
    userId: string,
    token: string,
  ): Promise<RefreshToken | null> {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, isRevoked: false },
    });

    for (const storedToken of tokens) {
      const isValid = await bcrypt.compare(token, storedToken.tokenHash);
      if (isValid && storedToken.expiresAt > new Date()) {
        return storedToken;
      }
    }

    return null;
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: { isRevoked: true },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }

  private calculateExpiry(expiresIn: string): Date {
    const seconds = this.parseExpiryToSeconds(expiresIn);
    return new Date(Date.now() + seconds * 1000);
  }

  private parseExpiryToSeconds(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiry format: ${expiresIn}`);
    }

    const value = parseInt(match[1]!, 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: throw new Error(`Invalid expiry unit: ${unit}`);
    }
  }
}
