import { CommandDefinition, CommandContext } from './base.js';
import { helpCommand } from './definitions/help.js';
import { loginCommand } from './definitions/login.js';
import { modelCommand } from './definitions/model.js';
import { clearCommand } from './definitions/clear.js';
import { reasoningCommand } from './definitions/reasoning.js';
import { initCommand } from './definitions/init.js';
import { log } from '../utils/logger.js';

const availableCommands: CommandDefinition[] = [
  helpCommand,
  loginCommand,
  modelCommand,
  clearCommand,
  reasoningCommand,
  initCommand,
];

export function getAvailableCommands(): CommandDefinition[] {
  return [...availableCommands];
}

export function getCommandNames(): string[] {
  return getAvailableCommands().map(cmd => cmd.command);
}

export async function handleSlashCommand(
  command: string, 
  context: CommandContext
) {
  // Extract the command part and arguments
  const fullCommand = command.slice(1);
  const spaceIndex = fullCommand.indexOf(' ');
  const cmd = spaceIndex > -1 ? fullCommand.substring(0, spaceIndex).toLowerCase() : fullCommand.toLowerCase();
  const argsString = spaceIndex > -1 ? fullCommand.substring(spaceIndex + 1).trim() : '';
  const args = argsString ? argsString.split(/\s+/) : [];
  
  const commandDef = getAvailableCommands().find(c => c.command === cmd);
  
  // Add user message for the command
  context.addMessage({
    role: 'user',
    content: command,
  });
  
  if (commandDef) {
    log.command(cmd, args, true);
    try {
      await commandDef.handler(context, args);
    } catch (error) {
      log.command(cmd, args, false);
      throw error;
    }
  } else {
    log.command(cmd, args, false);
  }
}

export { CommandDefinition, CommandContext } from './base.js';