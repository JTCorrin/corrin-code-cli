import { BaseProvider } from './BaseProvider.js';
import { ProviderConfig, ChatCompletionRequest, ChatCompletionResponse, ProviderStatus } from './types.js';

export class OpenAICompatibleProvider extends BaseProvider {
  private apiKey: string | null = null;
  private baseUrl: string;

  constructor(providerId: string, config: ProviderConfig) {
    super(providerId, config);
    this.baseUrl = config.base_url || 'http://localhost:11434/v1/';
    // Ensure base_url ends with /
    if (!this.baseUrl.endsWith('/')) {
      this.baseUrl += '/';
    }
  }

  public setApiKey(apiKey: string | null): void {
    this.apiKey = apiKey;
  }

  public async createChatCompletion(
    request: ChatCompletionRequest,
    abortSignal?: AbortSignal
  ): Promise<ChatCompletionResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Only add Authorization header if API key is provided
    // Some local providers (like Ollama) don't require authentication
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const body = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      stream: request.stream || false,
      // Include tools if provided and this provider supports them
      ...(request.tools && this.supportsTools() ? { 
        tools: request.tools,
        tool_choice: request.tool_choice 
      } : {})
    };

    try {
      const response = await fetch(`${this.baseUrl}chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: abortSignal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      return {
        choices: data.choices.map((choice: any) => ({
          message: {
            role: 'assistant' as const,
            content: choice.message.content,
            tool_calls: choice.message.tool_calls,
            reasoning: choice.message.reasoning
          },
          finish_reason: choice.finish_reason as 'stop' | 'tool_calls' | 'length' | 'content_filter'
        })),
        usage: data.usage ? {
          prompt_tokens: data.usage.prompt_tokens || 0,
          completion_tokens: data.usage.completion_tokens || 0,
          total_tokens: data.usage.total_tokens || 0
        } : undefined
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      throw new Error(`Failed to communicate with ${this.config.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async checkStatus(): Promise<ProviderStatus> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      // Try to make a minimal request to check if the service is available
      const response = await fetch(`${this.baseUrl}models`, {
        method: 'GET',
        headers,
        // Short timeout for status check
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        return { connected: true };
      } else {
        const errorText = await response.text();
        return { 
          connected: false, 
          error: `HTTP ${response.status}: ${errorText}` 
        };
      }
    } catch (error) {
      return { 
        connected: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  public supportsTools(): boolean {
    // Most local providers have limited or no tool support
    // This can be made configurable per provider if needed
    return false;
  }
}