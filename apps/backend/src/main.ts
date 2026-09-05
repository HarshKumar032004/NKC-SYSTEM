import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import fastifyCookie from '@fastify/cookie';

import { AppModule } from './app.module';
import type { EnvVars } from './config/env.schema';
import { TenantInterceptor } from './common/tenant/tenant.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  const config = app.get(ConfigService<EnvVars, true>);
  const prefix = config.get('API_PREFIX', { infer: true });
  const port = config.get('PORT', { infer: true });
  const corsOrigin = config.get('CORS_ORIGIN', { infer: true });

  app.setGlobalPrefix(prefix);
  app.useGlobalInterceptors(new TenantInterceptor());

  // Register cookie plugin WITHOUT a secret — JWT tokens are cryptographically
  // self-validating (signed by JWT_REFRESH_SECRET), so double-signing is redundant
  // and breaks middleware token verification (signed cookies have an 's:' prefix).
  await app.register(fastifyCookie as any);

  await app.register(helmet as any, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginEmbedderPolicy: { policy: 'require-corp' },
  });

  const origins = corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
