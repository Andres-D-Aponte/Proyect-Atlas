import { Module } from '@nestjs/common';
import { AuthModule } from './people/auth/auth.module';
import { UsersModule } from './people/users/users.module';
import { PlatformModule } from './platform/platform.module';
import { AppConfigModule } from './shared/config/config.module';
import { HealthModule } from './shared/health/health.module';
import { PrismaModule } from './shared/prisma/prisma.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    PlatformModule,
  ],
})
export class AppModule {}
