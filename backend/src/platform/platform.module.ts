import { Module } from '@nestjs/common';
import { CompaniesModule } from './companies/companies.module';
import { PlansModule } from './plans/plans.module';

@Module({
  imports: [PlansModule, CompaniesModule],
})
export class PlatformModule {}
