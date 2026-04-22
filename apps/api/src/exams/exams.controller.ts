import { CacheInterceptor } from '@nestjs/cache-manager';
import { Controller, Get, Param, ParseUUIDPipe, Query, UseInterceptors } from '@nestjs/common';

import { type Exam } from '../db/schema/exams';

import { ExamsQueryDto } from './dto/exams-query.dto';
import { type ExamsListResponse, ExamsService } from './exams.service';

@Controller('exams')
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  list(@Query() query: ExamsQueryDto): Promise<ExamsListResponse> {
    return this.exams.list(query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<Exam> {
    return this.exams.findById(id);
  }
}
