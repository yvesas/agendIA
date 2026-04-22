import { Module } from '@nestjs/common';

import { AppointmentsRepository } from './appointments.repository';

@Module({
  providers: [AppointmentsRepository],
  exports: [AppointmentsRepository],
})
export class AppointmentsModule {}
