# WardenAuthz NestJS Module

[![CI](https://github.com/ecarrizo2/wardenauthz-nestjs/actions/workflows/ci.yml/badge.svg)](https://github.com/ecarrizo2/wardenauthz-nestjs/actions/workflows/ci.yml) [![npm](https://img.shields.io/npm/v/@ecarrizo2/wardenauthz-nestjs)](https://www.npmjs.com/package/@ecarrizo2/wardenauthz-nestjs) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

NestJS module for [WardenAuthz](https://wardenauthz.com) — injectable authorization in your NestJS application. Provides declarative permission checking via `@RequiresPermission` decorator and `PermissionGuard`, plus full access to the underlying TypeScript SDK client for imperative checks.

## Installation

```bash
npm install @ecarrizo2/wardenauthz-nestjs @ecarrizo2/wardenauthz-js
```

The module has `@nestjs/common` and `@nestjs/core` as peer dependencies.

## Quick Start

### Synchronous Configuration (`forRoot`)

```typescript
import { Module } from '@nestjs/common'
import { WardenAuthModule } from '@ecarrizo2/wardenauthz-nestjs'

@Module({
  imports: [
    WardenAuthModule.forRoot({
      apiUrl: process.env.WARDENAUTH_API_URL!,
      apiKey: process.env.WARDENAUTH_API_KEY!,
    }),
  ],
})
export class AppModule {}
```

### Asynchronous Configuration (`forRootAsync`)

Use when your API key or URL comes from another service (e.g. `ConfigService`):

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { WardenAuthModule } from '@ecarrizo2/wardenauthz-nestjs'

@Module({
  imports: [
    ConfigModule.forRoot(),
    WardenAuthModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        apiUrl: config.getOrThrow('WARDENAUTH_API_URL'),
        apiKey: config.getOrThrow('WARDENAUTH_API_KEY'),
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

`WardenAuthService` extends `WardenAuthClient` from `@ecarrizo2/wardenauthz-js` and provides access to all resource groups:

| Resource           | Description                                |
| ------------------ | ------------------------------------------ |
| `service.access`   | Access evaluation (check, bulk, simulate)  |
| `service.scopes`   | Scope management (CRUD, manifest apply)    |
| `service.permissions` | Permission management (CRUD, bulk)     |
| `service.roles`    | Role management (CRUD, bulk, clone)        |
| `service.accessPolicies` | Policy assignment (CRUD)            |
| `service.apiKeys`  | API key management (CRUD, rotate)          |
| `service.webhooks` | Webhook endpoint management                |
| `service.audit`    | Audit log queries and export               |
| `service.sessionTokens` | Mint short-lived downscoped tokens   |
| `service.sodConstraints` | Separation of duty constraints       |
| `service.teamMembers` | Team member management                 |
| `service.resourceTypes` | Resource type catalog                |
| `service.tuples`   | Relationship tuples                        |
| `service.mcpServers` | MCP server management                    |
| `service.consent`  | Consent management                         |
| `service.agent`    | Agent management                           |

```typescript
import { Injectable } from '@nestjs/common'
import { WardenAuthService } from '@ecarrizo2/wardenauthz-nestjs'

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

### Declarative Permission Checking

Use `@RequiresPermission` on controllers or route handlers:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common'
import { RequiresPermission, PermissionGuard } from '@ecarrizo2/wardenauthz-nestjs'

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

#### How It Works

1. **`@RequiresPermission(resource, action)`** stores the required permission in route metadata.
2. **`PermissionGuard`** reads the metadata, resolves the `subjectId` and `scopeId` from the request, and calls `accessControl.access.hasAccess()`.
3. If `allowed === false`, the guard throws a `ForbiddenException`.
4. If no `@RequiresPermission` decorator is present, the guard passes through (allowing unguarded routes).

#### Custom Subject / Scope Resolvers

By default, the guard resolves:
- `subjectId` from `request.user.id`, `request.user.sub`, or `request.user.subjectId`
- `scopeId` from `request.params.scopeId` or `request.user.scopeId`

Override these with custom provider options:

```typescript
import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { WardenAuthModule, PermissionGuard, WardenAuthService } from '@ecarrizo2/wardenauthz-nestjs'

@Module({
  imports: [
    WardenAuthModule.forRoot({
      apiUrl: process.env.WARDENAUTH_API_URL!,
      apiKey: process.env.WARDENAUTH_API_KEY!,
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useFactory: (accessControl: WardenAuthService, reflector: Reflector) =>
        new PermissionGuard(reflector, accessControl, {
          subjectIdResolver: (ctx) => {
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

Apply `@RequiresPermission` at the controller class level — it applies to all routes:

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

## Health Check

`WardenAuthService` implements `OnModuleInit` and runs a health check against `GET /v1/health` during module initialization. A failed health check logs a warning but does not prevent the application from starting.

## API Reference

### `WardenAuthModule.forRoot(config)`

Creates a global dynamic module with synchronous configuration.

| Parameter     | Type                      | Description             |
| ------------- | ------------------------- | ----------------------- |
| `config.apiUrl` | `string`               | WardenAuthz API base URL |
| `config.apiKey` | `string`               | API key for authentication |

### `WardenAuthModule.forRootAsync(options)`

Creates a global dynamic module with asynchronous configuration.

| Option         | Type                                  | Description                          |
| -------------- | ------------------------------------- | ------------------------------------ |
| `options.useFactory` | `(...args: any[]) => WardenAuthClientConfig \| Promise<WardenAuthClientConfig>` | Factory returning config |
| `options.inject` | `any[]`                              | Tokens to inject into the factory    |
| `options.imports` | `any[]`                             | Modules required by the factory      |

### `PermissionGuard`

A `CanActivate` guard that checks `@RequiresPermission` metadata on routes.

Constructor:

| Parameter        | Type                         | Description                             |
| ---------------- | ---------------------------- | --------------------------------------- |
| `reflector`      | `Reflector`                  | NestJS reflector for reading metadata   |
| `accessControl`  | `WardenAuthService`          | Service for access evaluation           |
| `options?`       | `PermissionGuardOptions`     | Custom resolvers (optional)             |

### `PermissionGuardOptions`

| Option                 | Type                                           | Default                                |
| ---------------------- | ---------------------------------------------- | -------------------------------------- |
| `subjectIdResolver?`   | `(ctx: ExecutionContext) => string`             | Uses `request.user.id \|\| .sub \|\| .subjectId` |
| `scopeIdResolver?`     | `(ctx: ExecutionContext) => string`             | Uses `request.params.scopeId \|\| request.user.scopeId` |

### `@RequiresPermission(resource, action)`

Decorator factory that stores the required permission in route metadata.

| Parameter  | Type     | Description             |
| ---------- | -------- | ----------------------- |
| `resource` | `string` | Resource identifier     |
| `action`   | `string` | Action to check         |

### `REQUIRED_PERMISSION`

Constant metadata key (`'REQUIRED_PERMISSION'`) used by the decorator and guard.

### `WardenAuthService`

Extends `WardenAuthClient` from `@ecarrizo2/wardenauthz-js`. Additionally implements `OnModuleInit` for startup health checks.

## License

SEE LICENSE IN LICENSE
