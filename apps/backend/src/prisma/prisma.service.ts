import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { tenantAls } from '../common/tenant/tenant.context';
import { maskPii } from '../utils/mask-pii.util';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // In Prisma v5+, $on('query') was removed. Slow-query logging is now
    // handled directly inside the $extends query interceptor below.
    super({
      log: [
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    });

    // Capture the instance so we can use it inside the extension
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const prismaInstance = this;
    const logger = this.logger;
    const isDev = process.env.NODE_ENV !== 'production';

    const extended = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            const context = tenantAls.getStore();

            if (context?.branchId) {
              await prismaInstance.$executeRawUnsafe(
                `SET LOCAL app.current_branch_id = '${context.branchId}'`
              );
            }
            if (context?.bypassRls) {
              await prismaInstance.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'true'`);
            }

            // Slow-query logging (replaces the removed $on('query') API)
            if (isDev) {
              const start = Date.now();
              const result = await query(args);
              const duration = Date.now() - start;
              if (duration > 1000) {
                logger.warn(`Slow query (${duration}ms)`);
              }
              return result;
            }

            return query(args);
          },
        },
        auditLog: {
          async $allOperations({ operation, args, query }) {
            // Apply PII masking from the core for create/update operations
            if ((operation === 'create' || operation === 'update') && args.data) {
              const data = args.data as any;

              if (data.oldData) {
                try {
                  const parsed = typeof data.oldData === 'string' ? JSON.parse(data.oldData) : data.oldData;
                  data.oldData = JSON.stringify(maskPii(parsed));
                } catch (e) {
                  // Ignore parse errors
                }
              }

              if (data.newData) {
                try {
                  const parsed = typeof data.newData === 'string' ? JSON.parse(data.newData) : data.newData;
                  data.newData = JSON.stringify(maskPii(parsed));
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
            return query(args);
          },
        },
      },
    });

    return extended as unknown as this;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('✅ Prisma connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}
