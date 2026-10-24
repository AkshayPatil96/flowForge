import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  // Process liveness only; dependency readiness belongs on /ready.
  @Get()
  check() {
    return { status: 'ok' };
  }
}
