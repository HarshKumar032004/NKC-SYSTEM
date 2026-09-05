import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory, AppAbility } from './casl-ability.factory';
import { CHECK_POLICIES_KEY, PolicyHandlerCallback } from './check-policies.decorator';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyHandlers =
      this.reflector.get<PolicyHandlerCallback[]>(
        CHECK_POLICIES_KEY,
        context.getHandler(),
      ) || [];

    // If no policies defined for the route, we allow it (or you could restrict by default)
    if (policyHandlers.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    const ability = await this.caslAbilityFactory.createForUser(user);

    const isAllowed = policyHandlers.every((handler) => handler(ability));
    if (!isAllowed) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }

    return true;
  }
}
