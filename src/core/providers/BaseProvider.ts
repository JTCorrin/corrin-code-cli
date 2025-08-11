import { ProviderConfig, ChatCompletionRequest, ChatCompletionResponse, ProviderStatus, ModelInfo } from './types.js';

export abstract class BaseProvider {
  protected config: ProviderConfig;
  protected providerId: string;

  constructor(providerId: string, config: ProviderConfig) {
    this.providerId = providerId;
    this.config = config;
  }

  public getProviderId(): string {
    return this.providerId;
  }

  public getName(): string {
    return this.config.name;
  }

  public getModels(): ModelInfo[] {
    return this.config.models;
  }

  public hasModel(modelId: string): boolean {
    return this.config.models.some(model => model.id === modelId);
  }

  public getModel(modelId: string): ModelInfo | undefined {
    return this.config.models.find(model => model.id === modelId);
  }

  public abstract setApiKey(apiKey: string | null): void;
  
  public abstract createChatCompletion(
    request: ChatCompletionRequest, 
    abortSignal?: AbortSignal
  ): Promise<ChatCompletionResponse>;

  public abstract checkStatus(): Promise<ProviderStatus>;

  public abstract supportsTools(): boolean;
}