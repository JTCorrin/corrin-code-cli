import * as fs from 'fs';
import { getCorrinPaths, initializeCorrinDirectory } from './corrin-dir.js';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export enum LogCategory {
  AGENT = 'AGENT',
  TOOL = 'TOOL',
  SESSION = 'SESSION',
  ERROR = 'ERROR',
  COMMAND = 'COMMAND',
  PROVIDER = 'PROVIDER'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  sessionId?: string;
}

export class Logger {
  private currentLogLevel: LogLevel = LogLevel.INFO;
  private sessionId: string;
  private paths: any;
  private initialized: boolean = false;
  private logBuffers: Map<string, LogEntry[]> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializePaths();
  }

  /**
   * Set the logging level
   */
  public setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  /**
   * Set session ID for this logging session
   */
  public setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Log a debug message
   */
  public debug(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  /**
   * Log an info message
   */
  public info(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  /**
   * Log a warning message
   */
  public warn(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  /**
   * Log an error message
   */
  public error(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.ERROR, category, message, data);
  }

  /**
   * Main logging method
   */
  public log(level: LogLevel, category: LogCategory, message: string, data?: any): void {
    if (!this.initialized) {
      this.initializePaths();
    }

    // Skip if below current log level
    if (level < this.currentLogLevel) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: this.sanitizeData(data),
      sessionId: this.sessionId
    };

    // Write to appropriate log files
    this.writeToLogs(logEntry);
  }

  /**
   * Log tool execution
   */
  public logTool(toolName: string, args: any, result?: any, error?: any): void {
    const data = {
      tool: toolName,
      args: this.sanitizeData(args),
      ...(result && { result: this.sanitizeData(result) }),
      ...(error && { error: this.sanitizeData(error) })
    };

    this.info(LogCategory.TOOL, `Tool executed: ${toolName}`, data);
  }

  /**
   * Log API calls
   */
  public logApiCall(provider: string, model: string, duration: number, tokens?: any, error?: any): void {
    const data = {
      provider,
      model,
      duration,
      ...(tokens && { tokens }),
      ...(error && { error: this.sanitizeData(error) })
    };

    const level = error ? LogLevel.ERROR : LogLevel.DEBUG;
    this.log(level, LogCategory.AGENT, `API call to ${provider}`, data);
  }

  /**
   * Log command execution
   */
  public logCommand(command: string, args?: string[], success: boolean = true): void {
    const data = {
      command,
      args,
      success
    };

    this.info(LogCategory.COMMAND, `Command executed: ${command}`, data);
  }

  /**
   * Start a session log
   */
  public startSession(userQuery: string): void {
    this.info(LogCategory.SESSION, 'Session started', { query: userQuery });
  }

  /**
   * End a session log
   */
  public endSession(outcome: string): void {
    this.info(LogCategory.SESSION, 'Session ended', { outcome });
    this.flush(); // Ensure all logs are written at session end
  }

  /**
   * Flush all buffered logs to files
   */
  public flush(): void {
    for (const [filePath, entries] of this.logBuffers.entries()) {
      if (entries.length === 0) continue;

      const logContent = entries.map(entry => this.formatLogEntry(entry)).join('\n') + '\n';
      
      try {
        fs.appendFileSync(filePath, logContent, { encoding: 'utf8' });
        entries.length = 0; // Clear the buffer
      } catch (error) {
        // If we can't write to logs, fail silently to not break the main application
        console.error('Failed to write to log file:', error);
      }
    }
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }

  /**
   * Initialize logging paths and create directories
   */
  private initializePaths(): void {
    try {
      this.paths = initializeCorrinDirectory();
      this.initialized = true;

      // Set up periodic flush
      if (!this.flushInterval) {
        this.flushInterval = setInterval(() => this.flush(), 5000); // Flush every 5 seconds
      }
    } catch (error) {
      // If we can't initialize logging, continue without it
      this.initialized = false;
    }
  }

  /**
   * Write log entry to appropriate files
   */
  private writeToLogs(entry: LogEntry): void {
    if (!this.initialized || !this.paths) return;

    // Buffer logs for batch writing
    const logFiles = this.getLogFilesForEntry(entry);
    
    for (const filePath of logFiles) {
      if (!this.logBuffers.has(filePath)) {
        this.logBuffers.set(filePath, []);
      }
      this.logBuffers.get(filePath)!.push(entry);
    }
  }

  /**
   * Get appropriate log files for an entry
   */
  private getLogFilesForEntry(entry: LogEntry): string[] {
    const files: string[] = [];

    // All entries go to the daily agent log
    files.push(this.paths.agentLog);

    // Errors also go to error log
    if (entry.level === LogLevel.ERROR) {
      files.push(this.paths.errorLog);
    }

    // Tool entries also go to tool log
    if (entry.category === LogCategory.TOOL) {
      files.push(this.paths.toolLog);
    }

    // Session entries get their own file
    if (entry.category === LogCategory.SESSION) {
      const sessionLogPath = this.paths.sessions + `/session-${this.sessionId}.log`;
      files.push(sessionLogPath);
    }

    return files;
  }

  /**
   * Format a log entry for writing
   */
  private formatLogEntry(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';
    return `[${entry.timestamp}] ${levelName} [${entry.category}] ${entry.message}${dataStr}`;
  }

  /**
   * Sanitize data to remove sensitive information
   */
  private sanitizeData(data: any): any {
    if (!data) return data;
    if (typeof data !== 'object') return data;

    const sanitized = Array.isArray(data) ? [] : {};
    
    for (const [key, value] of Object.entries(data)) {
      // Remove or mask sensitive fields
      if (this.isSensitiveField(key)) {
        (sanitized as any)[key] = this.maskSensitiveValue(value);
      } else if (typeof value === 'object' && value !== null) {
        (sanitized as any)[key] = this.sanitizeData(value);
      } else {
        (sanitized as any)[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Check if a field contains sensitive information
   */
  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'api_key', 'apiKey', 'password', 'token', 'secret', 'auth',
      'authorization', 'bearer', 'key', 'credential'
    ];
    
    return sensitiveFields.some(field => 
      fieldName.toLowerCase().includes(field.toLowerCase())
    );
  }

  /**
   * Mask sensitive values
   */
  private maskSensitiveValue(value: any): string {
    if (typeof value !== 'string') return '[REDACTED]';
    if (value.length <= 8) return '[REDACTED]';
    return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
  }

  /**
   * Generate a session ID
   */
  private generateSessionId(): string {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -1);
  }
}

// Global logger instance
let globalLogger: Logger | null = null;

/**
 * Get the global logger instance
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  return globalLogger;
}

/**
 * Set the global log level
 */
export function setLogLevel(level: LogLevel): void {
  getLogger().setLogLevel(level);
}

/**
 * Convenience functions for common logging
 */
export const log = {
  debug: (category: LogCategory, message: string, data?: any) => getLogger().debug(category, message, data),
  info: (category: LogCategory, message: string, data?: any) => getLogger().info(category, message, data),
  warn: (category: LogCategory, message: string, data?: any) => getLogger().warn(category, message, data),
  error: (category: LogCategory, message: string, data?: any) => getLogger().error(category, message, data),
  
  tool: (toolName: string, args: any, result?: any, error?: any) => getLogger().logTool(toolName, args, result, error),
  api: (provider: string, model: string, duration: number, tokens?: any, error?: any) => 
    getLogger().logApiCall(provider, model, duration, tokens, error),
  command: (command: string, args?: string[], success?: boolean) => getLogger().logCommand(command, args, success),
  
  startSession: (userQuery: string) => getLogger().startSession(userQuery),
  endSession: (outcome: string) => getLogger().endSession(outcome),
  
  flush: () => getLogger().flush(),
  cleanup: () => getLogger().cleanup()
};