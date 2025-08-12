import * as fs from 'fs';
import * as path from 'path';

export interface CorrinPaths {
  root: string;
  logs: string;
  sessions: string;
  cache: string;
  config: string;
  agentLog: string;
  errorLog: string;
  toolLog: string;
  localSettings: string;
}

export class CorrinDirectoryManager {
  private projectRoot: string;
  private corrinRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.corrinRoot = path.join(projectRoot, '.corrin');
  }

  /**
   * Ensure the .corrin directory and all subdirectories exist
   */
  public ensureCorrinDirectories(): CorrinPaths {
    const paths = this.getCorrinPaths();

    // Create directories if they don't exist
    const dirsToCreate = [
      paths.root,
      paths.logs,
      paths.sessions,
      paths.cache,
      paths.config
    ];

    for (const dir of dirsToCreate) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
      }
    }

    // Create .gitignore in .corrin directory if it doesn't exist
    this.ensureGitIgnore();

    return paths;
  }

  /**
   * Get all Corrin directory paths
   */
  public getCorrinPaths(): CorrinPaths {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

    return {
      root: this.corrinRoot,
      logs: path.join(this.corrinRoot, 'logs'),
      sessions: path.join(this.corrinRoot, 'logs', 'sessions'),
      cache: path.join(this.corrinRoot, 'cache'),
      config: path.join(this.corrinRoot, 'config'),
      agentLog: path.join(this.corrinRoot, 'logs', `agent-${dateStr}.log`),
      errorLog: path.join(this.corrinRoot, 'logs', 'errors.log'),
      toolLog: path.join(this.corrinRoot, 'logs', 'tool-usage.log'),
      localSettings: path.join(this.corrinRoot, 'config', 'local-settings.json'),
    };
  }

  /**
   * Get path for a session log file
   */
  public getSessionLogPath(sessionId?: string): string {
    const paths = this.getCorrinPaths();
    const id = sessionId || this.generateSessionId();
    return path.join(paths.sessions, `session-${id}.log`);
  }

  /**
   * Generate a session ID based on timestamp
   */
  public generateSessionId(): string {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -1);
  }

  /**
   * Clean up old log files based on retention policy
   */
  public cleanupOldLogs(retentionDays: number = 30): void {
    const paths = this.getCorrinPaths();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Clean up old agent logs
    this.cleanupLogDirectory(paths.logs, 'agent-*.log', cutoffDate);
    
    // Clean up old session logs
    this.cleanupLogDirectory(paths.sessions, 'session-*.log', cutoffDate);
  }

  /**
   * Check if .corrin directory exists
   */
  public exists(): boolean {
    return fs.existsSync(this.corrinRoot);
  }

  /**
   * Get directory size in bytes
   */
  public getDirectorySize(): number {
    if (!this.exists()) return 0;
    
    let totalSize = 0;
    const calculateSize = (dirPath: string) => {
      try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            calculateSize(filePath);
          } else {
            totalSize += stat.size;
          }
        }
      } catch (error) {
        // Ignore errors for inaccessible files
      }
    };

    calculateSize(this.corrinRoot);
    return totalSize;
  }

  /**
   * Format directory size for human reading
   */
  public getDirectorySizeFormatted(): string {
    const size = this.getDirectorySize();
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let displaySize = size;

    while (displaySize >= 1024 && unitIndex < units.length - 1) {
      displaySize /= 1024;
      unitIndex++;
    }

    return `${displaySize.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Create or update .gitignore file in .corrin directory
   */
  private ensureGitIgnore(): void {
    const gitignorePath = path.join(this.corrinRoot, '.gitignore');
    const gitignoreContent = `# Corrin CLI local files
*
!.gitignore
# Feel free to commit specific files by adding them with !filename
`;

    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, gitignoreContent, { mode: 0o644 });
    }
  }

  /**
   * Clean up old files in a directory based on pattern and cutoff date
   */
  private cleanupLogDirectory(dirPath: string, pattern: string, cutoffDate: Date): void {
    if (!fs.existsSync(dirPath)) return;

    try {
      const files = fs.readdirSync(dirPath);
      const regex = new RegExp(pattern.replace('*', '.*'));

      for (const file of files) {
        if (regex.test(file)) {
          const filePath = path.join(dirPath, file);
          const stat = fs.statSync(filePath);
          if (stat.mtime < cutoffDate) {
            fs.unlinkSync(filePath);
          }
        }
      }
    } catch (error) {
      // Ignore cleanup errors - not critical
    }
  }
}

// Global instance for the current project
let globalCorrinManager: CorrinDirectoryManager | null = null;

/**
 * Get the global Corrin directory manager instance
 */
export function getCorrinManager(): CorrinDirectoryManager {
  if (!globalCorrinManager) {
    globalCorrinManager = new CorrinDirectoryManager();
  }
  return globalCorrinManager;
}

/**
 * Initialize Corrin directory for the current project
 */
export function initializeCorrinDirectory(): CorrinPaths {
  const manager = getCorrinManager();
  return manager.ensureCorrinDirectories();
}

/**
 * Get Corrin paths for the current project
 */
export function getCorrinPaths(): CorrinPaths {
  const manager = getCorrinManager();
  return manager.getCorrinPaths();
}