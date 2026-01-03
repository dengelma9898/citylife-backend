import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UsersService } from '../../users/users.service';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Allow OPTIONS requests (CORS preflight) to pass through
    if (request.method === 'OPTIONS') {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const user = request.user;

    if (!user) {
      this.logger.warn('No user found in request');
      return false;
    }

    // Prüfe zuerst auf Business-User
    const userData = await this.usersService.getById(user.uid);
    if (!userData) {
      this.logger.warn(`No user data found for user ${user.uid}`);
      return false;
    }
    if ('businessIds' in userData) {
      return requiredRoles.includes('business_user');
    }

    return requiredRoles.includes(userData.userType);
  }
}
