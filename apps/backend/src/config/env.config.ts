import { registerAs } from '@nestjs/config';

import type { EnvVars } from './env.schema';

export const appConfig = registerAs(
  'app',
  (): Pick<EnvVars, 'NODE_ENV' | 'PORT' | 'API_PREFIX' | 'CORS_ORIGIN'> => ({
    NODE_ENV: (process.env.NODE_ENV as EnvVars['NODE_ENV']) ?? 'development',
    PORT: Number(process.env.PORT ?? 3001),
    API_PREFIX: process.env.API_PREFIX ?? 'api/v1',
    CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  }),
);

export const databaseConfig = registerAs(
  'database',
  (): Pick<
    EnvVars,
    'DATABASE_HOST' | 'DATABASE_PORT' | 'DATABASE_USER' | 'DATABASE_PASSWORD' | 'DATABASE_NAME'
  > => ({
    DATABASE_HOST: process.env.DATABASE_HOST ?? 'localhost',
    DATABASE_PORT: Number(process.env.DATABASE_PORT ?? 6432),
    DATABASE_USER: process.env.DATABASE_USER ?? 'nkc',
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD ?? 'nkc_secret',
    DATABASE_NAME: process.env.DATABASE_NAME ?? 'nkc_ims',
  }),
);

export const redisConfig = registerAs(
  'redis',
  (): Pick<EnvVars, 'REDIS_HOST' | 'REDIS_PORT'> => ({
    REDIS_HOST: process.env.REDIS_HOST ?? 'localhost',
    REDIS_PORT: Number(process.env.REDIS_PORT ?? 6379),
  }),
);
