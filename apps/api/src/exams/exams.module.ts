import { Module } from '@nestjs/common';

import { ExamsRepository } from './exams.repository';

@Module({
  providers: [ExamsRepository],
  exports: [ExamsRepository],
})
export class ExamsModule {}
