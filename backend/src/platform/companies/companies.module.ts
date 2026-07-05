import { Module } from '@nestjs/common';
import { ImpersonationModule } from '../impersonation/impersonation.module';
import { LicensesModule } from '../licenses/licenses.module';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';

@Module({
  imports: [LicensesModule, ImpersonationModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
