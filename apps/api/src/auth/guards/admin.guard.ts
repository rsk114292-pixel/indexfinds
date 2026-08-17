import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';
import { isAdminIpAllowed } from './admin-network-policy';

/**
 * AdminGuard - Admin role verification
 * Must be used with JwtAuthGuard (JWT authentication first, then role check)
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, AdminGuard)
 * @Controller('admin')
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    if (!isAdminIpAllowed(request.ip, process.env.ADMIN_ALLOWED_IPS)) {
      throw new ForbiddenException('Admin access is not allowed from this IP');
    }

    return true;
  }
}
