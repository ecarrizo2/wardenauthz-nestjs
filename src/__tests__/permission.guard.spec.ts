import { Reflector } from '@nestjs/core'
import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { PermissionGuard, REQUIRED_PERMISSION, RequiredPermission } from '../guards/permission.guard'

describe('PermissionGuard', () => {
  let guard: PermissionGuard
  let mockReflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>
  let mockAccessControl: { access: { hasAccess: jest.Mock } }
  let mockContext: jest.Mocked<ExecutionContext>
  let mockRequest: Record<string, any>

  function createMockContext(req?: Record<string, any>): jest.Mocked<ExecutionContext> {
    const request = req || { user: { id: 'user-1', scopeId: 'scope-1' }, params: { scopeId: 'scope-1' } }

    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
        getResponse: jest.fn(),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getType: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as any
  }

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as any

    mockAccessControl = {
      access: {
        hasAccess: jest.fn(),
      },
    }

    mockRequest = { user: { id: 'user-1', scopeId: 'scope-1' }, params: { scopeId: 'scope-1' } }
    mockContext = createMockContext(mockRequest)

    guard = new PermissionGuard(mockReflector as any, mockAccessControl as any)
  })

  describe('canActivate', () => {
    describe('when no @RequiresPermission decorator is present', () => {
      it('should return true, allowing unguarded routes', async () => {
        mockReflector.getAllAndOverride.mockReturnValue(undefined)

        const result = await guard.canActivate(mockContext)

        expect(result).toBe(true)
        expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(REQUIRED_PERMISSION, [
          mockContext.getHandler(),
          mockContext.getClass(),
        ])
      })
    })

    describe('when subjectId cannot be resolved', () => {
      it('should throw ForbiddenException', async () => {
        const reqWithoutSubject = { user: {}, params: { scopeId: 'scope-1' } }
        mockContext = createMockContext(reqWithoutSubject)
        mockReflector.getAllAndOverride.mockReturnValue({ resource: 'documents', action: 'read' })

        await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException)
        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          'Unable to resolve subject or scope for permission check'
        )
      })
    })

    describe('when scopeId cannot be resolved', () => {
      it('should throw ForbiddenException', async () => {
        const reqWithoutScope = { user: { id: 'user-1' }, params: {} }
        mockContext = createMockContext(reqWithoutScope)
        mockReflector.getAllAndOverride.mockReturnValue({ resource: 'documents', action: 'read' })

        await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException)
        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          'Unable to resolve subject or scope for permission check'
        )
      })
    })

    describe('when access is allowed', () => {
      it('should call accessControl.access.hasAccess with correct parameters', async () => {
        const requiredPermission: RequiredPermission = { resource: 'documents', action: 'read' }
        mockReflector.getAllAndOverride.mockReturnValue(requiredPermission)
        mockAccessControl.access.hasAccess.mockResolvedValue({ allowed: true })

        await guard.canActivate(mockContext)

        expect(mockAccessControl.access.hasAccess).toHaveBeenCalledWith({
          subjectId: 'user-1',
          scopeId: 'scope-1',
          resource: 'documents',
          action: 'read',
        })
      })

      it('should return true', async () => {
        mockReflector.getAllAndOverride.mockReturnValue({ resource: 'documents', action: 'read' })
        mockAccessControl.access.hasAccess.mockResolvedValue({ allowed: true })

        const result = await guard.canActivate(mockContext)

        expect(result).toBe(true)
      })
    })

    describe('when access is denied', () => {
      it('should throw ForbiddenException with the required permission in the message', async () => {
        mockReflector.getAllAndOverride.mockReturnValue({ resource: 'documents', action: 'read' })
        mockAccessControl.access.hasAccess.mockResolvedValue({ allowed: false })

        await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException)
        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          "Access denied — requires 'documents:read'"
        )
      })
    })
  })

  describe('reflector usage', () => {
    it('should use getAllAndOverride to retrieve metadata from both handler and class', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined)

      await guard.canActivate(mockContext)

      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
        REQUIRED_PERMISSION,
        [mockContext.getHandler(), mockContext.getClass()]
      )
    })
  })

  describe('custom resolvers', () => {
    it('should use custom subjectIdResolver when provided', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({ resource: 'documents', action: 'read' })
      mockAccessControl.access.hasAccess.mockResolvedValue({ allowed: true })

      const customGuard = new PermissionGuard(
        mockReflector as any,
        mockAccessControl as any,
        {
          subjectIdResolver: () => 'custom-subject-id',
          scopeIdResolver: () => 'custom-scope-id',
        }
      )

      await customGuard.canActivate(mockContext)

      expect(mockAccessControl.access.hasAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectId: 'custom-subject-id',
          scopeId: 'custom-scope-id',
        })
      )
    })

    it('should use custom scopeIdResolver when provided', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({ resource: 'documents', action: 'read' })
      mockAccessControl.access.hasAccess.mockResolvedValue({ allowed: true })

      const customGuard = new PermissionGuard(
        mockReflector as any,
        mockAccessControl as any,
        {
          scopeIdResolver: (ctx) => {
            const req = ctx.switchToHttp().getRequest()
            return req.headers?.['x-workspace-id'] || 'fallback-scope'
          },
        }
      )

      const reqWithHeader = {
        user: { id: 'user-1' },
        params: { scopeId: 'params-scope' },
        headers: { 'x-workspace-id': 'header-workspace' },
      }
      mockContext = createMockContext(reqWithHeader)

      await customGuard.canActivate(mockContext)

      expect(mockAccessControl.access.hasAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          scopeId: 'header-workspace',
        })
      )
    })

    it('should use default resolver when no custom resolver is provided', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({ resource: 'documents', action: 'read' })
      mockAccessControl.access.hasAccess.mockResolvedValue({ allowed: true })

      await guard.canActivate(mockContext)

      expect(mockAccessControl.access.hasAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectId: 'user-1',
          scopeId: 'scope-1',
        })
      )
    })
  })

  describe('default subjectId resolver', () => {
    it('should fall back to user.sub when user.id is absent', async () => {
      const reqWithSub = { user: { sub: 'sub-1' }, params: { scopeId: 'scope-1' } }
      mockContext = createMockContext(reqWithSub)
      mockReflector.getAllAndOverride.mockReturnValue({ resource: 'documents', action: 'read' })
      mockAccessControl.access.hasAccess.mockResolvedValue({ allowed: true })

      await guard.canActivate(mockContext)

      expect(mockAccessControl.access.hasAccess).toHaveBeenCalledWith(
        expect.objectContaining({ subjectId: 'sub-1' })
      )
    })

    it('should fall back to user.subjectId when both user.id and user.sub are absent', async () => {
      const reqWithSubjectId = { user: { subjectId: 'subject-id-1' }, params: { scopeId: 'scope-1' } }
      mockContext = createMockContext(reqWithSubjectId)
      mockReflector.getAllAndOverride.mockReturnValue({ resource: 'documents', action: 'read' })
      mockAccessControl.access.hasAccess.mockResolvedValue({ allowed: true })

      await guard.canActivate(mockContext)

      expect(mockAccessControl.access.hasAccess).toHaveBeenCalledWith(
        expect.objectContaining({ subjectId: 'subject-id-1' })
      )
    })
  })

  describe('default scopeId resolver', () => {
    it('should use request.params.scopeId when available', async () => {
      const reqWithParamScope = { user: { id: 'user-1' }, params: { scopeId: 'scope-from-params' } }
      mockContext = createMockContext(reqWithParamScope)
      mockReflector.getAllAndOverride.mockReturnValue({ resource: 'documents', action: 'read' })
      mockAccessControl.access.hasAccess.mockResolvedValue({ allowed: true })

      await guard.canActivate(mockContext)

      expect(mockAccessControl.access.hasAccess).toHaveBeenCalledWith(
        expect.objectContaining({ scopeId: 'scope-from-params' })
      )
    })

    it('should fall back to user.scopeId when params.scopeId is absent', async () => {
      const reqWithUserScope = { user: { id: 'user-1', scopeId: 'user-scope' }, params: {} }
      mockContext = createMockContext(reqWithUserScope)
      mockReflector.getAllAndOverride.mockReturnValue({ resource: 'documents', action: 'read' })
      mockAccessControl.access.hasAccess.mockResolvedValue({ allowed: true })

      await guard.canActivate(mockContext)

      expect(mockAccessControl.access.hasAccess).toHaveBeenCalledWith(
        expect.objectContaining({ scopeId: 'user-scope' })
      )
    })
  })

  describe('complete flow: reflector → resolver → hasAccess → result', () => {
    it('should read metadata, resolve identity, check access, and return true when allowed', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({ resource: 'orders', action: 'cancel' })
      mockAccessControl.access.hasAccess.mockResolvedValue({ allowed: true })

      const result = await guard.canActivate(mockContext)

      expect(mockReflector.getAllAndOverride).toHaveBeenCalledTimes(1)
      expect(mockAccessControl.access.hasAccess).toHaveBeenCalledWith({
        subjectId: 'user-1',
        scopeId: 'scope-1',
        resource: 'orders',
        action: 'cancel',
      })
      expect(result).toBe(true)
    })

    it('should throw ForbiddenException in the complete flow when access is denied', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({ resource: 'orders', action: 'cancel' })
      mockAccessControl.access.hasAccess.mockResolvedValue({ allowed: false, reason: 'Policy forbids' })

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException)
    })
  })
})
