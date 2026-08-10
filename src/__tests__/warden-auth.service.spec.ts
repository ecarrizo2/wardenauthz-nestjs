import { Logger } from '@nestjs/common'

const mockAccess = { hasAccess: jest.fn() }

jest.mock('@ecarrizo2/wardenauthz-js', () => ({
  WardenAuthClient: class MockWardenAuthClient {
    scopes!: any
    permissions!: any
    roles!: any
    accessPolicies!: any
    apiKeys!: any
    webhooks!: any
    access!: any
    audit!: any
    sessionTokens!: any
    sodConstraints!: any
    teamMembers!: any
    resourceTypes!: any
    tuples!: any
    mcpServers!: any
    consent!: any
    agent!: any

    constructor(_config: any) {
      this.scopes = {}
      this.permissions = {}
      this.roles = {}
      this.accessPolicies = {}
      this.apiKeys = {}
      this.webhooks = {}
      this.access = mockAccess
      this.audit = {}
      this.sessionTokens = {}
      this.sodConstraints = {}
      this.teamMembers = {}
      this.resourceTypes = {}
      this.tuples = {}
      this.mcpServers = {}
      this.consent = {}
      this.agent = {}
    }
  },
}))

import { WardenAuthService } from '../warden-auth.service'
import { WardenAuthClient } from '@ecarrizo2/wardenauthz-js'

describe('WardenAuthService', () => {
  const validConfig = { apiUrl: 'https://api.example.com', apiKey: 'test-api-key' }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('instantiation', () => {
    it('should be defined', () => {
      const service = new WardenAuthService(validConfig)

      expect(service).toBeDefined()
    })

    it('should extend WardenAuthClient', () => {
      const service = new WardenAuthService(validConfig)

      expect(service).toBeInstanceOf(WardenAuthClient)
    })

    it('should have all resource properties inherited from WardenAuthClient', () => {
      const service = new WardenAuthService(validConfig)

      expect(service.scopes).toBeDefined()
      expect(service.permissions).toBeDefined()
      expect(service.roles).toBeDefined()
      expect(service.accessPolicies).toBeDefined()
      expect(service.apiKeys).toBeDefined()
      expect(service.webhooks).toBeDefined()
      expect(service.access).toBeDefined()
      expect(service.audit).toBeDefined()
      expect(service.sessionTokens).toBeDefined()
      expect(service.sodConstraints).toBeDefined()
      expect(service.teamMembers).toBeDefined()
      expect(service.resourceTypes).toBeDefined()
      expect(service.tuples).toBeDefined()
      expect(service.mcpServers).toBeDefined()
      expect(service.consent).toBeDefined()
      expect(service.agent).toBeDefined()
    })

    it('should provide access.hasAccess for permission checks', () => {
      const service = new WardenAuthService(validConfig)

      expect(service.access.hasAccess).toBe(mockAccess.hasAccess)
    })
  })

  describe('onModuleInit', () => {
    const originalFetch = global.fetch

    beforeEach(() => {
      global.fetch = jest.fn() as any
      jest.spyOn(Logger.prototype, 'log').mockImplementation()
    })

    afterEach(() => {
      global.fetch = originalFetch
      jest.restoreAllMocks()
    })

    it('should log success when health check returns 200', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 })
      const logSpy = jest.spyOn(Logger.prototype, 'log')

      const service = new WardenAuthService(validConfig)
      await service.onModuleInit()

      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/v1/health')
      expect(logSpy).toHaveBeenCalledWith('Successfully connected to WardenAuth API')
    })

    it('should log warning when health check returns a non-ok status', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 })
      const warnSpy = jest.spyOn(Logger.prototype, 'warn')

      const service = new WardenAuthService(validConfig)
      await service.onModuleInit()

      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/v1/health')
      expect(warnSpy).toHaveBeenCalledWith('WardenAuth API health check returned status 500')
    })

    it('should log warning when fetch rejects with a network error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
      const warnSpy = jest.spyOn(Logger.prototype, 'warn')

      const service = new WardenAuthService(validConfig)
      await service.onModuleInit()

      expect(warnSpy).toHaveBeenCalledWith(
        'Unable to connect to WardenAuth API — verify your apiUrl and apiKey configuration'
      )
    })
  })
})
