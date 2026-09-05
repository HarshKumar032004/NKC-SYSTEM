import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  branchId?: string;
  bypassRls?: boolean;
}

export const tenantAls = new AsyncLocalStorage<TenantContext>();
