import { Module } from '@nestjs/common';
import { BranchesModule } from './branches/branches.module';
import { CompanySettingsModule } from './company-settings/company-settings.module';

@Module({
  imports: [CompanySettingsModule, BranchesModule],
})
export class SettingsModule {}
