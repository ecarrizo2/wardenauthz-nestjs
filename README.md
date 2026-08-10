# @access-control/nestjs-module

NestJS module for the [WardenAuth API](https://wardenauthz.com). Provides declarative permission checking via `@RequiresPermission` decorator and `PermissionGuard`, plus full access to the underlying TypeScript SDK client.

## Installation

```bash
npm install @access-control/nestjs-module @ecarrizo/access-control
```

## Quick Start

### Synchronous Configuration (`forRoot`)

```typescript
// app.module.ts
import { Module } from '@nestjs/common'
import { WardenAuthModule } from '@access-control/nestjs-module'

@Module({
  imports: [
    WardenAuthModule.forRoot({
      apiUrl: process.env.ACCESS_CONTROL_API_URL!,
      apiKey: process.env.ACCESS_CONTROL_API_KEY!,
    }),
  ],
})
export class AppModule {}
```

### Asynchronous Configuration (`forRootAsync`)

Use when your API key or URL comes from another service (e.g. ConfigService, AWS Secrets Manager):

```typescript
// app.module.ts
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { WardenAuthModule } from '@access-control/nestjs-module'

@Module({
  imports: [
    ConfigModule.forRoot(),
    WardenAuthModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        apiUrl: config.getOrThrow('ACCESS_CONTROL_API_URL'),
        apiKey: config.getOrThrow('ACCESS_CONTROL_API_KEY'),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

The module is registered as `global: true`, so `WardenAuthService` is available everywhere without re-importing.

## Usage

### WardenAuthService

The `WardenAuthService` extends `WardenAuthClient` from `@ecarrizo/access-control` and exposes all 11 resource groups:

```typescript
import { Injectable } from '@nestjs/common'
import { WardenAuthService } from '@access-control/nestjs-module'

@Injectable()
export class DocumentsService {
  constructor(private readonly rbac: WardenAuthService) {}

  async getDocument(userId: string, workspaceId: string, docId: string) {
    const { allowed } = await this.rbac.access.hasAccess({
      subjectId: userId,
      scopeId: workspaceId,
      resource: 'documents',
      action: 'read',
    })

    if (!allowed) {
      throw new ForbiddenException()
    }

    // ... fetch document
  }
}
```

Full resource list:

| Resource                 | Description                                |
| ------------------------ | ------------------------------------------ |
| `service.access`         | Access evaluation (check, bulk, simulate)  |
| `service.scopes`         | Scope management (CRUD, manifest apply)    |
| `service.permissions`    | Permission management (CRUD, bulk, import) |
| `service.roles`          | Role management (CRUD, bulk, clone)        |
| `service.accessPolicies` | Policy assignment (CRUD)                   |
| `service.apiKeys`        | API key management (CRUD, rotate)          |
| `service.webhooks`       | Webhook endpoint management                |
| `service.audit`          | Audit log queries and export               |
| `service.sessionTokens`  | Mint short-lived downscoped tokens         |
| `service.sodConstraints` | Separation of duty constraints             |
| `service.teamMembers`    | Team member management                     |
| `service.resourceTypes`  | Resource type catalog                      |

### Declarative Permission Checking

Use `@RequiresPermission` on controllers or route handlers:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common'
import { RequiresPermission, PermissionGuard } from '@access-control/nestjs-module'

interface AuthenticatedRequest extends Request {
  user: { id: string; scopeId: string }
}

@Controller('documents')
@UseGuards(PermissionGuard)
export class DocumentsController {
  @Get()
  @RequiresPermission('documents', 'read')
  async listDocuments() {
    // PermissionGuard already verified the caller has documents:read
    return this.documentsService.findAll()
  }

  @Get(':id')
  @RequiresPermission('documents', 'read')
  async getDocument() {
    return this.documentsService.findById()
  }
}
```

#### How it works

1. **`@RequiresPermission(resource, action)`** stores the required permission on the route metadata.
2. **`PermissionGuard`** reads the metadata, resolves the `subjectId` and `scopeId` from the request, and calls `accessControl.access.hasAccess()`.
3. If `allowed === false`, the guard throws a `ForbiddenException`.
4. If no `@RequiresPermission` decorator is present, the guard passes through.

#### Custom Subject / Scope Resolvers

By default, the guard reads:

- `subjectId` from `request.user.id`, `request.user.sub`, or `request.user.subjectId`
- `scopeId` from `request.params.scopeId` or `request.user.scopeId`

Override these with a custom provider:

```typescript
// app.module.ts
import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { WardenAuthModule, PermissionGuard } from '@access-control/nestjs-module'

@Module({
  imports: [
    WardenAuthModule.forRoot({
      apiUrl: process.env.ACCESS_CONTROL_API_URL!,
      apiKey: process.env.ACCESS_CONTROL_API_KEY!,
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useFactory: (accessControl: WardenAuthService, reflector: Reflector) =>
        new PermissionGuard(reflector, accessControl, {
          subjectIdResolver: (ctx) => {
            // e.g. read from a custom JWT claim
            const req = ctx.switchToHttp().getRequest()
            return req.auth?.sub ?? ''
          },
          scopeIdResolver: (ctx) => {
            const req = ctx.switchToHttp().getRequest()
            return (req.headers['x-workspace-id'] as string) ?? ''
          },
        }),
      inject: [WardenAuthService, Reflector],
    },
  ],
})
export class AppModule {}
```

### Class-Level Guards

You can apply `@RequiresPermission` at the controller class level — it applies to all routes:

```typescript
@Controller('admin')
@UseGuards(PermissionGuard)
@RequiresPermission('admin', 'access')
export class AdminController {
  @Get('users')
  async listUsers() {} // requires admin:access

  @Get('settings')
  async getSettings() {} // requires admin:access
}
```

Route-level decorators override class-level ones:

```typescript
@Controller('documents')
@UseGuards(PermissionGuard)
@RequiresPermission('documents', 'read')
export class DocumentsController {
  @Get()
  async list() {} // requires documents:read

  @Delete(':id')
  @RequiresPermission('documents', 'delete') // overrides class-level
  async delete() {}
}
```

## Health Check on Module Init

`WardenAuthService` implements `OnModuleInit` and runs a health check against `GET /v1/health` during module initialization. A failed health check logs a warning but does not prevent the application from starting.

## License

SEE LICENSE IN LICENSE
