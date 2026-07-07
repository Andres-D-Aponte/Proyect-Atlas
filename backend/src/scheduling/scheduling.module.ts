import { Module } from '@nestjs/common';
import { AppointmentsModule } from './appointments/appointments.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { ResourcesModule } from './resources/resources.module';
import { ScheduleExceptionsModule } from './schedule-exceptions/schedule-exceptions.module';
import { WaitlistModule } from './waitlist/waitlist.module';

@Module({
  imports: [
    ProfessionalsModule,
    ResourcesModule,
    ScheduleExceptionsModule,
    AppointmentsModule,
    WaitlistModule,
  ],
})
export class SchedulingModule {}
