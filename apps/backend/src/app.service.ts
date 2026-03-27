import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  healthCheck() {
    return {
      status: 'ok',
      app: 'Integral Cosméticos API',
      version: process.env.APP_VERSION || '0.1.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'local',
    };
  }
}
