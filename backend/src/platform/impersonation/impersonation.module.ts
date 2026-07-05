import { Module } from '@nestjs/common';
import { ImpersonationService } from './impersonation.service';

@Module({
  providers: [ImpersonationService],
  exports: [ImpersonationService],
})
export class ImpersonationModule {}
