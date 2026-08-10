jest.mock('@ecarrizo2/wardenauthz-js', () => ({
  WardenAuthClient: class MockWardenAuthClient {},
}))

import { WardenAuthModule } from '../warden-auth.module'
import { WardenAuthService } from '../warden-auth.service'

describe('WardenAuthModule', () => {
  const validConfig = { apiUrl: 'https://api.example.com', apiKey: 'test-api-key' }

  describe('forRoot', () => {
    it('should create a DynamicModule with the module reference', () => {
      const module = WardenAuthModule.forRoot(validConfig)

      expect(module.module).toBe(WardenAuthModule)
    })

    it('should provide WardenAuthService via useFactory that creates an instance', () => {
      const module = WardenAuthModule.forRoot(validConfig)

      expect(module.providers).toBeDefined()
      expect(module.providers).toHaveLength(1)
      expect(module.providers![0]).toMatchObject({
        provide: WardenAuthService,
      })

      const provider = module.providers![0] as any
      const instance = provider.useFactory()
      expect(instance).toBeInstanceOf(WardenAuthService)
    })

    it('should export WardenAuthService', () => {
      const module = WardenAuthModule.forRoot(validConfig)

      expect(module.exports).toContain(WardenAuthService)
    })

    it('should be registered as global', () => {
      const module = WardenAuthModule.forRoot(validConfig)

      expect(module.global).toBe(true)
    })
  })

  describe('forRootAsync', () => {
    it('should create a DynamicModule with the module reference', () => {
      const module = WardenAuthModule.forRootAsync({
        useFactory: () => validConfig,
      })

      expect(module.module).toBe(WardenAuthModule)
    })

    it('should provide WardenAuthService via a factory that builds from resolved config', async () => {
      const factory = jest.fn().mockReturnValue(validConfig)
      const module = WardenAuthModule.forRootAsync({ useFactory: factory })
      const provider = module.providers![0] as any

      const instance = await provider.useFactory()
      expect(instance).toBeInstanceOf(WardenAuthService)
      expect(factory).toHaveBeenCalled()
    })

    it('should pass the inject array from options to the provider', () => {
      const mockDependency = class TestDependency {}
      const options = {
        useFactory: (_dep: typeof mockDependency) => validConfig,
        inject: [mockDependency],
      }

      const module = WardenAuthModule.forRootAsync(options)
      const provider = module.providers![0] as any

      expect(provider.inject).toBe(options.inject)
    })

    it('should default inject to an empty array when provided as empty', () => {
      const module = WardenAuthModule.forRootAsync({
        useFactory: () => validConfig,
        inject: [],
      })
      const provider = module.providers![0] as any

      expect(provider.inject).toEqual([])
    })

    it('should forward an empty inject array when none is provided', () => {
      const module = WardenAuthModule.forRootAsync({
        useFactory: () => validConfig,
      })
      const provider = module.providers![0] as any

      expect(provider.inject).toEqual([])
    })

    it('should include imports from options in the DynamicModule', () => {
      const mockImports = [class TestModule {}]
      const module = WardenAuthModule.forRootAsync({
        useFactory: () => validConfig,
        imports: mockImports,
      })

      expect(module.imports).toBe(mockImports)
    })

    it('should default to an empty imports array when none is provided', () => {
      const module = WardenAuthModule.forRootAsync({
        useFactory: () => validConfig,
      })

      expect(module.imports).toEqual([])
    })

    it('should be registered as global', () => {
      const module = WardenAuthModule.forRootAsync({
        useFactory: () => validConfig,
      })

      expect(module.global).toBe(true)
    })

    it('should support an async factory function', async () => {
      const factory = jest.fn().mockResolvedValue(validConfig)
      const module = WardenAuthModule.forRootAsync({ useFactory: factory })
      const provider = module.providers![0] as any

      const instance = await provider.useFactory()
      expect(instance).toBeInstanceOf(WardenAuthService)
      expect(factory).toHaveBeenCalled()
    })

    it('should handle factory that receives injected dependencies', async () => {
      const injectedValue = { apiUrl: 'https://injected.example.com', apiKey: 'injected-key' }
      const factory = jest.fn().mockImplementation((dep: any) => ({
        apiUrl: dep.apiUrl,
        apiKey: dep.apiKey,
      }))

      const module = WardenAuthModule.forRootAsync({
        useFactory: factory,
        inject: [class ConfigService {}],
      })
      const provider = module.providers![0] as any

      const instance = await provider.useFactory(injectedValue)
      expect(instance).toBeInstanceOf(WardenAuthService)
      expect(factory).toHaveBeenCalledWith(injectedValue)
    })

    it('should export WardenAuthService', () => {
      const module = WardenAuthModule.forRootAsync({
        useFactory: () => validConfig,
      })

      expect(module.exports).toContain(WardenAuthService)
    })
  })
})
