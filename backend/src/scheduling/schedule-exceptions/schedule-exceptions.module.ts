import { Module } from '@nestjs/common';
import { ScheduleExceptionsController } from './schedule-exceptions.controller';
import { ScheduleExceptionsService } from './schedule-exceptions.service';

@Module({
  controllers: [ScheduleExceptionsController],
  providers: [ScheduleExceptionsService],
  exports: [ScheduleExceptionsService],
})
export class ScheduleExceptionsModule {}
