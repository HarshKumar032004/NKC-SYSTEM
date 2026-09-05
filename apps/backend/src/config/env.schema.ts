import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3001),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  // Prisma connection URL (takes precedence for Prisma; built from parts for raw SQL if needed)
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  // Individual parts kept for non-Prisma usage / health checks
  DATABASE_HOST: Joi.string().hostname().default('localhost'),
  DATABASE_PORT: Joi.number().port().default(6432),
  DATABASE_USER: Joi.string().default('nkc_user'),
  DATABASE_PASSWORD: Joi.string().default('changeme'),
  DATABASE_NAME: Joi.string().default('nkc_db'),
  REDIS_HOST: Joi.string().hostname().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).optional(),
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  COOKIE_SECRET: Joi.string().optional(),
  // Cloudflare R2
  R2_ACCOUNT_ID: Joi.string().required(),
  R2_ACCESS_KEY_ID: Joi.string().required(),
  R2_SECRET_ACCESS_KEY: Joi.string().required(),
  R2_BUCKET_NAME: Joi.string().default('nkc-ims-vault'),
  // Mailer
  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),
  MAIL_FROM: Joi.string().default('noreply@nkcims.com'),
});

export interface EnvVars {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  API_PREFIX: string;
  CORS_ORIGIN: string;
  DATABASE_URL: string;
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_NAME: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  COOKIE_SECRET?: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  // Mailer (SMTP)
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  MAIL_FROM: string;
  // Redis
  REDIS_URL: string;
}
