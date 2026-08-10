import { SetMetadata } from '@nestjs/common'
import { REQUIRED_PERMISSION, RequiredPermission } from '../guards/permission.guard'

export const RequiresPermission = (resource: string, action: string) =>
  SetMetadata(REQUIRED_PERMISSION, { resource, action } as RequiredPermission)
