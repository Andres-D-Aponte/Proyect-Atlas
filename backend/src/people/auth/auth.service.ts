import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '../../../generated/prisma';
import { UsersService } from '../users/users.service';
import { RefreshTokenService } from './refresh-token.service';
import { AuthenticatedUser, JwtPayload } from './auth-user.interface';
import { AuthTokensDto } from './dto/auth-tokens.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async login(email: string, password: string): Promise<AuthTokensDto> {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId ?? undefined,
    });
  }

  async refresh(rawRefreshToken: string): Promise<AuthTokensDto> {
    const stored = await this.refreshTokenService.consume(rawRefreshToken);
    const user = await this.usersService.findById(stored.userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    return this.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId ?? undefined,
    });
  }

  async logout(rawRefreshToken: string): Promise<void> {
    await this.refreshTokenService.revoke(rawRefreshToken);
  }

  /**
   * Emite un par de tokens para que el Platform Owner opere temporalmente
   * como Business Admin de `companyId`. El `sub` sigue siendo el propio
   * Platform Owner (nunca se suplantan credenciales de otro usuario) — lo
   * que cambia es el `role` efectivo y el `companyId` de contexto.
   */
  async issueImpersonationTokens(
    platformOwnerId: number,
    companyId: number,
  ): Promise<AuthTokensDto> {
    const platformOwner = await this.usersService.findById(platformOwnerId);

    if (!platformOwner || platformOwner.role !== Role.PLATFORM_OWNER) {
      throw new ForbiddenException(
        'Solo el Platform Owner puede impersonar una empresa',
      );
    }

    return this.issueTokensForPayload({
      sub: platformOwner.id,
      email: platformOwner.email,
      role: Role.BUSINESS_ADMIN,
      companyId,
      impersonatedBy: platformOwner.id,
    });
  }

  private issueTokens(user: AuthenticatedUser): Promise<AuthTokensDto> {
    return this.issueTokensForPayload({
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });
  }

  private async issueTokensForPayload(
    payload: JwtPayload,
  ): Promise<AuthTokensDto> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.refreshTokenService.issue(payload.sub),
    ]);

    return { accessToken, refreshToken };
  }
}
