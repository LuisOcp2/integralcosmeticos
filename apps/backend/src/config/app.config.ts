import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'local',
  port: parseInt(process.env.PORT || '3000', 10),
  name: process.env.APP_NAME || 'Integral Cosméticos',
  version: process.env.APP_VERSION || '0.1.0',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
}));
