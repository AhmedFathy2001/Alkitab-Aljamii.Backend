import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TokenService } from './token.service.js';
import type { User } from '@prisma/client';
import type { LoginDto } from '../dto/login.dto.js';
import type { AuthResponseDto, TokensResponseDto } from '../dto/auth-response.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async login(dto: LoginDto, deviceInfo?: string): Promise<AuthResponseDto> {
    const user = await this.validateCredentials(dto.email, dto.password);

    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.email,
      user.role,
    );

    await this.tokenService.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      deviceInfo,
    );

    await this.updateLastLogin(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      refreshExpiresIn: tokens.refreshExpiresIn,
    };
  }

  async refresh(
    userId: string,
    refreshToken: string,
  ): Promise<TokensResponseDto> {
    const storedToken = await this.tokenService.validateRefreshToken(
      userId,
      refreshToken,
    );

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    await this.tokenService.revokeRefreshToken(storedToken.id);

    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.email,
      user.role,
    );

    await this.tokenService.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      storedToken.deviceInfo,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      refreshExpiresIn: tokens.refreshExpiresIn,
    };
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const storedToken = await this.tokenService.validateRefreshToken(
      userId,
      refreshToken,
    );

    if (storedToken) {
      await this.tokenService.revokeRefreshToken(storedToken.id);
    }
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.tokenService.revokeAllUserTokens(userId);
  }

  private async validateCredentials(
    email: string,
    password: string,
  ): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { email, isActive: true, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  private async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });
  }
}
