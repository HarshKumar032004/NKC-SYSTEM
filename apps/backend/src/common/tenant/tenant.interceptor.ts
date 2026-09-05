import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tenantAls } from './tenant.context';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    return tenantAls.run({ branchId: user?.branchId, bypassRls: user?.role === 'SUPER_ADMIN' }, () => {
      return next.handle();
    });
  }
}
