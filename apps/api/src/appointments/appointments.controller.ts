import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { type AuthenticatedUser } from '../auth/jwt.strategy';
import { type Appointment } from '../db/schema/appointments';

import { AppointmentsService } from './appointments.service';
import { AppointmentsQueryDto } from './dto/appointments-query.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAppointmentDto,
  ): Promise<Appointment> {
    return this.appointments.create(user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AppointmentsQueryDto,
  ): Promise<Appointment[]> {
    return this.appointments.listByUser(user.id, query.status);
  }
}
