import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma';
import { AuthService } from '../../people/auth/auth.service';
import { AuthTokensDto } from '../../people/auth/dto/auth-tokens.dto';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class ImpersonationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Registra el motivo de la impersonación (auditoría inmutable, solo
   * inserción) y solo entonces emite los tokens. Si la empresa no existe, la
   * llave foránea de `companyId` hace fallar la inserción del log antes de
   * emitir ningún token.
   */
  async impersonate(
    platformOwnerId: number,
    companyId: number,
    reason: string,
    ipAddress: string | undefined,
  ): Promise<AuthTokensDto> {
    try {
      await this.prisma.impersonationLog.create({
        data: { platformOwnerId, companyId, reason, ipAddress },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new NotFoundException(`Empresa ${companyId} no encontrada`);
      }
      throw error;
    }

    return this.authService.issueImpersonationTokens(
      platformOwnerId,
      companyId,
    );
  }
}
