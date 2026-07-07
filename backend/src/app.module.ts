import { Module } from '@nestjs/common';
import { CatalogModule } from './catalog/catalog.module';
import { ClientsModule } from './clients/clients.module';
import { AuthModule } from './people/auth/auth.module';
import { UsersModule } from './people/users/users.module';
import { PlatformModule } from './platform/platform.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { SettingsModule } from './settings/settings.module';
import { AppConfigModule } from './shared/config/config.module';
import { HealthModule } from './shared/health/health.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { TenancyModule } from './shared/tenancy/tenancy.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    TenancyModule,
    HealthModule,
    UsersModule,
    AuthModule,
    PlatformModule,
    SettingsModule,
    CatalogModule,
    ClientsModule,
    SchedulingModule,
  ],
})
export class AppModule {}
