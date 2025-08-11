export interface CommandContext {
  addMessage: (message: any) => void;
  clearHistory: () => void;
  setShowLogin: (show: boolean) => void;
  setShowModelSelector?: (show: boolean) => void;
  toggleReasoning?: () => void;
  showReasoning?: boolean;
  sendMessage?: (message: string) => Promise<void>;
}

export interface CommandDefinition {
  command: string;
  description: string;
  handler: (context: CommandContext, args?: string[]) => void | Promise<void>;
}

export abstract class BaseCommand implements CommandDefinition {
  abstract command: string;
  abstract description: string;
  abstract handler(context: CommandContext, args?: string[]): void | Promise<void>;
}