import { BaseProvider } from './BaseProvider.js';
import { GroqProvider } from './GroqProvider.js';
import { OpenAICompatibleProvider } from './OpenAICompatibleProvider.js';
import { ProviderConfig, ModelInfo } from './types.js';

export interface GroupedModel {
  providerId: string;
  providerName: string;
  model: ModelInfo;
}

export class ProviderManager {
  private providers: Map<string, BaseProvider> = new Map();
  private configs: Map<string, ProviderConfig> = new Map();

  public registerProvider(providerId: string, config: ProviderConfig): BaseProvider {
    // Remove existing provider if it exists
    this.providers.delete(providerId);
    this.configs.delete(providerId);

    // Create appropriate provider instance
    let provider: BaseProvider;
    switch (config.type) {
      case 'groq':
        provider = new GroqProvider(providerId, config);
        break;
      case 'openai':
        provider = new OpenAICompatibleProvider(providerId, config);
        break;
      default:
        throw new Error(`Unknown provider type: ${config.type}`);
    }

    // Store provider and config
    this.providers.set(providerId, provider);
    this.configs.set(providerId, config);

    return provider;
  }

  public getProvider(providerId: string): BaseProvider | undefined {
    return this.providers.get(providerId);
  }

  public getAllProviders(): BaseProvider[] {
    return Array.from(this.providers.values());
  }

  public getProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }

  public findProviderForModel(modelId: string): BaseProvider | undefined {
    for (const provider of this.providers.values()) {
      if (provider.hasModel(modelId)) {
        return provider;
      }
    }
    return undefined;
  }

  public getAllModels(): GroupedModel[] {
    const allModels: GroupedModel[] = [];
    
    for (const [providerId, provider] of this.providers.entries()) {
      const models = provider.getModels();
      for (const model of models) {
        allModels.push({
          providerId,
          providerName: provider.getName(),
          model
        });
      }
    }

    return allModels;
  }

  public getModelsByProvider(): Map<string, { provider: BaseProvider; models: ModelInfo[] }> {
    const modelsByProvider = new Map<string, { provider: BaseProvider; models: ModelInfo[] }>();
    
    for (const [providerId, provider] of this.providers.entries()) {
      modelsByProvider.set(providerId, {
        provider,
        models: provider.getModels()
      });
    }

    return modelsByProvider;
  }

  public setApiKeyForProvider(providerId: string, apiKey: string | null): void {
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.setApiKey(apiKey);
    }
  }

  public async checkAllProviderStatus(): Promise<Map<string, { provider: BaseProvider; status: any }>> {
    const statusMap = new Map();
    
    for (const [providerId, provider] of this.providers.entries()) {
      try {
        const status = await provider.checkStatus();
        statusMap.set(providerId, { provider, status });
      } catch (error) {
        statusMap.set(providerId, { 
          provider, 
          status: { 
            connected: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          } 
        });
      }
    }

    return statusMap;
  }

  public removeProvider(providerId: string): boolean {
    const existed = this.providers.has(providerId);
    this.providers.delete(providerId);
    this.configs.delete(providerId);
    return existed;
  }

  public clear(): void {
    this.providers.clear();
    this.configs.clear();
  }

  public static createDefaultConfig(): Map<string, ProviderConfig> {
    const configs = new Map<string, ProviderConfig>();

    // Default Groq provider
    configs.set('groq', {
      name: 'Groq',
      type: 'groq',
      models: GroqProvider.getDefaultModels()
    });

    return configs;
  }
}