export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  context_window?: number;
  default_max_tokens?: number;
}

export interface ProviderConfig {
  name: string;
  type: 'groq' | 'openai';
  base_url?: string;
  api_key?: string;
  models: ModelInfo[];
  supports_tools?: boolean; // Optional, defaults to true
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  tools?: any[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: any[];
      reasoning?: string;
    };
    finish_reason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ProviderStatus {
  connected: boolean;
  error?: string;
}