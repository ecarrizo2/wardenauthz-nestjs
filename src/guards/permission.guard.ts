import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { WardenAuthService } from '../warden-auth.service'

export const REQUIRED_PERMISSION = 'REQUIRED_PERMISSION'

export interface RequiredPermission {
  resource: string
  action: string
}

export interface PermissionGuardOptions {
  subjectIdResolver?: (context: ExecutionContext) => string
  scopeIdResolver?: (context: ExecutionContext) => string
}

const defaultSubjectIdResolver = (context: ExecutionContext): string => {
  const request = context.switchToHttp().getRequest()
  return request.user?.id || request.user?.sub || request.user?.subjectId || ''
}

const defaultScopeIdResolver = (context: ExecutionContext): string => {
  const request = context.switchToHttp().getRequest()
  return request.params?.scopeId || request.user?.scopeId || ''
}

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly subjectIdResolver: (context: ExecutionContext) => string
  private readonly scopeIdResolver: (context: ExecutionContext) => string

  constructor(
    private readonly reflector: Reflector,
    private readonly accessControl: WardenAuthService,
    options?: PermissionGuardOptions
  ) {
    this.subjectIdResolver = options?.subjectIdResolver || defaultSubjectIdResolver
    this.scopeIdResolver = options?.scopeIdResolver || defaultScopeIdResolver
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<RequiredPermission>(REQUIRED_PERMISSION, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredPermission) {
      return true
    }

    const subjectId = this.subjectIdResolver(context)
    const scopeId = this.scopeIdResolver(context)

    if (!subjectId || !scopeId) {
      throw new ForbiddenException('Unable to resolve subject or scope for permission check')
    }

    const result = await this.accessControl.access.hasAccess({
      subjectId,
      scopeId,
      resource: requiredPermission.resource,
      action: requiredPermission.action,
    })

    if (!result.allowed) {
      throw new ForbiddenException(
        `Access denied — requires '${requiredPermission.resource}:${requiredPermission.action}'`
      )
    }

    return true
  }
}
