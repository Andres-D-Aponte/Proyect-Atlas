import { Module } from '@nestjs/common';
import { ScheduleExceptionsModule } from '../schedule-exceptions/schedule-exceptions.module';
import { WaitlistModule } from '../waitlist/waitlist.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [ScheduleExceptionsModule, WaitlistModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
