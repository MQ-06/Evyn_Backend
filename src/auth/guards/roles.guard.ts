  import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
  import { Reflector } from '@nestjs/core';
  import { Role } from '../../users/enums/role.enum';
  import { ROLES_KEY } from '../decorators/roles.decorator';

  @Injectable()
  export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {
      // Reflector reads metadata from decorators.
      // We use it to find out which roles are required for a given route.
    }

    canActivate(context: ExecutionContext): boolean {
      // Step 1: Read the required roles from the @Roles() decorator on this route
      const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),  // check the method decorator first
        context.getClass(),    // then check the class decorator
      ]);

      // If no @Roles() decorator is on this route, allow anyone through
      if (!requiredRoles) return true;

      // Step 2: Get the user from req.user (put there by JwtStrategy.validate())
      const { user } = context.switchToHttp().getRequest();

      // Step 3: Check if the user's role is in the required roles list
      return requiredRoles.includes(user.role);
      // Returns true = allow, false = 403 Forbidden
    }
  }