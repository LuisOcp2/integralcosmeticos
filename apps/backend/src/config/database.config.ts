import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASSWORD || 'cosmeticos2026',
  name: process.env.POSTGRES_DB || 'cosmeticos_db',
  synchronize: (process.env.DB_SYNCHRONIZE || 'false').toLowerCase() === 'true',
}));
