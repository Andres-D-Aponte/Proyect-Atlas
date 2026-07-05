import { Module } from '@nestjs/common';
import { LicensesService } from './licenses.service';

@Module({
  providers: [LicensesService],
  exports: [LicensesService],
})
export class LicensesModule {}
