import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get nodeEnv(): string {
    return this.configService.getOrThrow<string>('NODE_ENV');
  }

  get port(): number {
    return this.configService.getOrThrow<number>('PORT');
  }

  get databaseUrl(): string {
    return this.configService.getOrThrow<string>('DATABASE_URL');
  }

  get jwtAccessSecret(): string {
    return this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
  }

  get jwtAccessExpiresIn(): string {
    return this.configService.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN');
  }

  get refreshTokenTtlDays(): number {
    return this.configService.getOrThrow<number>('REFRESH_TOKEN_TTL_DAYS');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
}
