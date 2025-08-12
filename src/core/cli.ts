#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { render } from 'ink';
import React from 'react';
import { Agent } from './agent.js';
import App from '../ui/App.js';
import { initializeCorrinDirectory, getCorrinManager } from '../utils/corrin-dir.js';
import { getLogger, setLogLevel, LogLevel, LogCategory } from '../utils/logger.js';

const program = new Command();

async function startChat(
  temperature: number,
  system: string | null,
  debug?: boolean,
  logLevel?: LogLevel
): Promise<void> {
  console.log(chalk.hex('#FF4500')(`                             

 ░▒▓██████▓▒░ ░▒▓██████▓▒░░▒▓███████▓▒░░▒▓███████▓▒░░▒▓█▓▒░▒▓███████▓▒░ ░▒▓██████▓▒░        ░▒▓██████▓▒░ ░▒▓██████▓▒░░▒▓███████▓▒░░▒▓████████▓▒░ 
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░        
░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░        
░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓███████▓▒░░▒▓███████▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓██████▓▒░   
░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░        
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░        
 ░▒▓██████▓▒░ ░▒▓██████▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓██████▓▒░        ░▒▓██████▓▒░ ░▒▓██████▓▒░░▒▓███████▓▒░░▒▓████████▓▒░ 
                                                                                                                                                 
                                                                                                                                                  
`));

  try {
    // Initialize .corrin directory
    const corrinPaths = initializeCorrinDirectory();
    const manager = getCorrinManager();

    // Set up logging
    const logger = getLogger();
    if (logLevel !== undefined) {
      setLogLevel(logLevel);
    } else if (debug) {
      setLogLevel(LogLevel.DEBUG);
    } else {
      setLogLevel(LogLevel.INFO);
    }

    // Log startup
    logger.info(LogCategory.SESSION, 'CLI started', {
      version: '1.0.2',
      temperature,
      debug,
      logLevel: LogLevel[logger['currentLogLevel'] || LogLevel.INFO],
      corrinDir: corrinPaths.root,
      corrinSize: manager.getDirectorySizeFormatted()
    });

    let defaultModel = 'moonshotai/kimi-k2-instruct';

    // Create agent (API key will be checked on first message)
    const agent = await Agent.create(defaultModel, temperature, system, debug);

    // Set up cleanup on exit
    const cleanup = () => {
      logger.info(LogCategory.SESSION, 'CLI shutting down');
      logger.cleanup();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('beforeExit', () => logger.cleanup());

    render(React.createElement(App, { agent }));
  } catch (error) {
    const logger = getLogger();
    logger.error(LogCategory.ERROR, 'Failed to initialize CLI', { error: error instanceof Error ? error.message : String(error) });
    console.log(chalk.red(`Error initializing agent: ${error}`));
    process.exit(1);
  }
}

program
  .name('corrino')
  .description('Corrino Code CLI')
  .version('1.0.0')
  .option('-t, --temperature <temperature>', 'Temperature for generation', parseFloat, 1.0)
  .option('-s, --system <message>', 'Custom system message')
  .option('-d, --debug', 'Enable debug logging (equivalent to --log-level debug)')
  .option('--log-level <level>', 'Set logging level (debug, info, warn, error)', 'info')
  .option('--no-logs', 'Disable logging completely')
  .action(async (options) => {
    // Parse log level
    let logLevel: LogLevel | undefined = undefined;

    if (options.logs === false) {
      // --no-logs was used, disable logging
      logLevel = LogLevel.ERROR + 1; // Above ERROR level to disable all logging
    } else {
      // Parse log level string
      const levelStr = options.debug ? 'debug' : options.logLevel.toLowerCase();
      switch (levelStr) {
        case 'debug': logLevel = LogLevel.DEBUG; break;
        case 'info': logLevel = LogLevel.INFO; break;
        case 'warn': case 'warning': logLevel = LogLevel.WARN; break;
        case 'error': logLevel = LogLevel.ERROR; break;
        default:
          console.log(chalk.yellow(`Invalid log level: ${levelStr}. Using 'info'.`));
          logLevel = LogLevel.INFO;
      }
    }

    await startChat(
      options.temperature,
      options.system || null,
      options.debug,
      logLevel
    );
  });

program.parse();
