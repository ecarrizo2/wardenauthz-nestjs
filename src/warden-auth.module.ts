import { DynamicModule, Module, Provider } from '@nestjs/common'
import { WardenAuthClientConfig } from '@ecarrizo2/wardenauthz-js'
import { WardenAuthService } from './warden-auth.service'

export interface WardenAuthModuleAsyncOptions {
  imports?: any[]
  useFactory: (...args: any[]) => Promise<WardenAuthClientConfig> | WardenAuthClientConfig
  inject?: any[]
}

@Module({})
export class WardenAuthModule {
  static forRoot(config: WardenAuthClientConfig): DynamicModule {
    return {
      module: WardenAuthModule,
      providers: [
        {
          provide: WardenAuthService,
          useFactory: () => new WardenAuthService(config),
        },
      ],
      exports: [WardenAuthService],
      global: true,
    }
  }

  static forRootAsync(options: WardenAuthModuleAsyncOptions): DynamicModule {
    const serviceProvider: Provider = {
      provide: WardenAuthService,
      useFactory: async (...args: any[]) => {
        const config = await options.useFactory(...args)
        return new WardenAuthService(config)
      },
      inject: options.inject || [],
    }

    return {
      module: WardenAuthModule,
      imports: options.imports || [],
      providers: [serviceProvider],
      exports: [WardenAuthService],
      global: true,
    }
  }
}
