import { Module } from '@nestjs/common';
import { UsersModule } from '../../people/users/users.module';
import { ImpersonationModule } from '../impersonation/impersonation.module';
import { LicensesModule } from '../licenses/licenses.module';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';

@Module({
  imports: [LicensesModule, ImpersonationModule, UsersModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
