import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

interface HealthStatus {
  status: 'ok';
  timestamp: string;
  uptimeSeconds: number;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  check(): HealthStatus {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}
