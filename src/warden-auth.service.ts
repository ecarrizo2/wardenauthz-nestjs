import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { WardenAuthClient, WardenAuthClientConfig } from '@ecarrizo2/wardenauthz-js'

@Injectable()
export class WardenAuthService extends WardenAuthClient implements OnModuleInit {
  private readonly logger = new Logger(WardenAuthService.name)
  private readonly apiUrl: string

  constructor(config: WardenAuthClientConfig) {
    super(config)
    this.apiUrl = config.apiUrl
  }

  async onModuleInit(): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/v1/health`)

      if (!response.ok) {
        this.logger.warn(`WardenAuth API health check returned status ${response.status}`)
        return
      }

      this.logger.log('Successfully connected to WardenAuth API')
    } catch {
      this.logger.warn('Unable to connect to WardenAuth API — verify your apiUrl and apiKey configuration')
    }
  }
}
