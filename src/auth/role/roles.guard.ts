import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from 'src/users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;

    const request = await context.switchToHttp().getRequest();
    const user = request.user; // از AuthGuard پر می‌شود

    if (!user) {
      throw new ForbiddenException('کاربر احراز هویت نشده است.');
    }
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('شما مجاز به انجام این عملیات نیستید.');
    }

    return true;
  }
}
