import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
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
    });
  }

  async logout(rawRefreshToken: string): Promise<void> {
    await this.refreshTokenService.revoke(rawRefreshToken);
  }

  private async issueTokens(user: AuthenticatedUser): Promise<AuthTokensDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.refreshTokenService.issue(user.id),
    ]);

    return { accessToken, refreshToken };
  }
}
