jest.mock('@ecarrizo2/wardenauthz-js', () => ({
  WardenAuthClient: class MockWardenAuthClient {
    access = { hasAccess: jest.fn() }
    scopes = {}
    permissions = {}
    roles = {}
    accessPolicies = {}
    apiKeys = {}
    webhooks = {}
    audit = {}
    sessionTokens = {}
    sodConstraints = {}
    teamMembers = {}
    resourceTypes = {}
    tuples = {}
    mcpServers = {}
    consent = {}
    agent = {}
  },
}))

import { Test, TestingModule } from '@nestjs/testing'
import { WardenAuthModule } from '../warden-auth.module'
import { WardenAuthService } from '../warden-auth.service'
import { PermissionGuard } from '../guards/permission.guard'
import { Reflector } from '@nestjs/core'

describe('WardenAuthModule Integration', () => {
  let module: TestingModule

  beforeEach(async () => {
    const service = new (jest.requireMock('@ecarrizo2/wardenauthz-js').WardenAuthClient)()
    module = await Test.createTestingModule({
      imports: [
        WardenAuthModule.forRoot({
          apiUrl: 'https://api.example.com',
          apiKey: 'test-key',
        }),
      ],
      providers: [
        {
          provide: PermissionGuard,
          useFactory: (reflector: Reflector, svc: WardenAuthService) =>
            new PermissionGuard(reflector, svc),
          inject: [Reflector, WardenAuthService],
        },
      ],
    }).compile()
  })

  afterEach(async () => {
    if (module && typeof module.close === 'function') {
      await module.close()
    }
  })

  describe('GIVEN a module configured with forRoot', () => {
    it('THEN WardenAuthService should be defined', () => {
      const service = module.get(WardenAuthService)
      expect(service).toBeDefined()
    })

    it('THEN WardenAuthService should be the same instance across resolutions', () => {
      const a = module.get(WardenAuthService)
      const b = module.get(WardenAuthService)
      expect(a).toBe(b)
    })

    it('THEN service should have all resource properties', () => {
      const service = module.get(WardenAuthService)
      expect(service.access).toBeDefined()
      expect(service.scopes).toBeDefined()
      expect(service.permissions).toBeDefined()
      expect(service.roles).toBeDefined()
      expect(service.apiKeys).toBeDefined()
      expect(service.webhooks).toBeDefined()
      expect(service.audit).toBeDefined()
      expect(service.sessionTokens).toBeDefined()
      expect(service.teamMembers).toBeDefined()
      expect(service.resourceTypes).toBeDefined()
      expect(service.tuples).toBeDefined()
    })

    it('THEN PermissionGuard should be injectable', () => {
      const guard = module.get(PermissionGuard)
      expect(guard).toBeDefined()
    })
  })

  describe('GIVEN a module configured with forRootAsync', () => {
    beforeEach(async () => {
      if (module && typeof module.close === 'function') {
        await module.close()
      }
      module = await Test.createTestingModule({
        imports: [
          WardenAuthModule.forRootAsync({
            useFactory: () => ({
              apiUrl: 'https://api-async.example.com',
              apiKey: 'async-key',
            }),
          }),
        ],
      }).compile()
    })

    it('THEN service should be defined with async config', () => {
      const service = module.get(WardenAuthService)
      expect(service).toBeDefined()
    })
  })
})
