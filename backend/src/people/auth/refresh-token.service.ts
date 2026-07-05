import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AppConfigService } from '../../shared/config/app-config.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RefreshToken } from '../../../generated/prisma';

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  private hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  async issue(userId: number): Promise<string> {
    const rawToken = randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.config.refreshTokenTtlDays);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hash(rawToken),
        userId,
        expiresAt,
      },
    });

    return rawToken;
  }

  /**
   * Valida el refresh token presentado, lo revoca (rotación) y devuelve el
   * registro junto con el usuario dueño. Lanza si no existe, expiró o ya fue
   * usado/revocado antes (evita reutilizar un token robado).
   */
  async consume(rawToken: string): Promise<RefreshToken> {
    const tokenHash = this.hash(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return stored;
  }

  async revoke(rawToken: string): Promise<void> {
    const tokenHash = this.hash(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
