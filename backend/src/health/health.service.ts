import { Injectable } from '@nestjs/common';
import { timestamp } from 'rxjs';

@Injectable()
export class HealthService {
  check() {
    return {
      status: 'ok',
      service: 'hr-leave-management-api',
      timestamp: new Date().toISOString(),
    };
  }
}
