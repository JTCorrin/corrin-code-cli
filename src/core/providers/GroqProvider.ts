import Groq from 'groq-sdk';
import { BaseProvider } from './BaseProvider.js';
import { ProviderConfig, ChatCompletionRequest, ChatCompletionResponse, ProviderStatus, ModelInfo } from './types.js';

export class GroqProvider extends BaseProvider {
  private client: Groq | null = null;
  private apiKey: string | null = null;

  constructor(providerId: string, config: ProviderConfig) {
    super(providerId, config);
  }

  public setApiKey(apiKey: string | null): void {
    this.apiKey = apiKey;
    if (apiKey) {
      this.client = new Groq({ apiKey });
    } else {
      this.client = null;
    }
  }

  public async createChatCompletion(
    request: ChatCompletionRequest,
    abortSignal?: AbortSignal
  ): Promise<ChatCompletionResponse> {
    if (!this.client) {
      throw new Error('Groq client not initialized. Please set API key.');
    }

    const response = await this.client.chat.completions.create({
      model: request.model,
      messages: request.messages as any,
      tools: request.tools,
      tool_choice: request.tool_choice,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      stream: false
    }, {
      signal: abortSignal
    }) as any; // Cast to any to handle Groq SDK type differences

    return {
      choices: response.choices.map((choice: any) => ({
        message: {
          role: 'assistant' as const,
          content: choice.message.content,
          tool_calls: choice.message.tool_calls,
          reasoning: choice.message.reasoning
        },
        finish_reason: choice.finish_reason as 'stop' | 'tool_calls' | 'length' | 'content_filter'
      })),
      usage: response.usage ? {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens
      } : undefined
    };
  }

  public async checkStatus(): Promise<ProviderStatus> {
    if (!this.client || !this.apiKey) {
      return { connected: false, error: 'No API key configured' };
    }

    try {
      // Make a minimal test request to check if the API key is valid
      await this.client.chat.completions.create({
        model: this.config.models[0]?.id || 'llama3-8b-8192',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      });
      return { connected: true };
    } catch (error) {
      return { 
        connected: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  public supportsTools(): boolean {
    return true;
  }

  public static getDefaultModels(): ModelInfo[] {
    return [
      { id: 'moonshotai/kimi-k2-instruct', name: 'Kimi K2 Instruct', description: 'Most capable model' },
      { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', description: 'Fast, capable, and cheap model' },
      { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', description: 'Fastest and cheapest model' },
      { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B', description: '' },
      { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick', description: '' },
      { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', description: '' },
    ];
  }
}