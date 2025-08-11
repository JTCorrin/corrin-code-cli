import { CommandDefinition, CommandContext } from '../base.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const initCommand: CommandDefinition = {
  command: 'init',
  description: 'Create CORRIN.md project guide by analyzing the codebase',
  handler: async ({ addMessage, sendMessage }: CommandContext, args: string[] = []) => {
    // Check for --force flag
    const hasForceFlag = args.includes('--force');

    const projectRoot = process.cwd();
    const corrinMdPath = path.join(projectRoot, 'CORRIN.md');

    // Check if CORRIN.md already exists
    let fileExists = false;
    try {
      await fs.access(corrinMdPath);
      fileExists = true;
    } catch {
      // File doesn't exist, continue
    }

    if (fileExists && !hasForceFlag) {
      addMessage({
        role: 'system',
        content: 'CORRIN.md already exists. Use "/init --force" to overwrite it.',
      });
      return;
    }

    // Add message indicating we're starting the analysis
    addMessage({
      role: 'system',
      content: 'Starting codebase analysis to create CORRIN.md...',
    });

    // Send comprehensive analysis prompt to the agent
    if (sendMessage) {
      const analysisPrompt = `Please analyze this project structure and create a comprehensive CORRIN.md file that provides guidance for AI assistants working with this project.

You have access to these tools:
- **list_files**: List files and folders in a directory  
- **search_files**: Search for text patterns in files (grep)
- **read_file**: Read the contents of a file
- **execute_command**: Execute shell commands like find, ls, etc.
- **create_file**: Create or overwrite a file with content

IMPORTANT: Follow these steps in order:

1. **First, discover the project structure:**
   - Use 'list_files' to explore the root directory structure
   - Use 'execute_command' with commands like 'find . -name "*.json" | head -20' to find configuration files
   - Use 'search_files' to search for key patterns like "build", "test", "lint" in package.json files
   - Look for README files, documentation, and configuration files

2. **Then, analyze what you found:**
   - Use 'read_file' on README.md and any other documentation files
   - Read package.json and other configuration files (tsconfig.json, eslint configs, etc.)
   - Check if CLAUDE.md exists and read it to understand the expected format

3. **Explore the codebase architecture:**
   - Use 'search_files' to find main entry points, exports, and key patterns
   - Use 'read_file' on the main source files you discovered
   - Understand the folder structure and module organization

4. **Finally, create CORRIN.md with these sections:**
   - **Project Overview**: Brief description based on what you learned
   - **Architecture**: Key architectural patterns and structure  
   - **Development Commands**: All npm scripts found in package.json files
   - **Code Style Guidelines**: Based on eslint/prettier configs and observed patterns
   - **Testing Requirements**: Based on test scripts and test file patterns
   - **Provider System**: If this is the Groq Code CLI, explain the provider architecture
   - **Important Notes**: Any special considerations you discovered

Use 'create_file' to create CORRIN.md in the project root with all your findings.

The goal is to create a guide similar to CLAUDE.md but tailored for this specific project, helping future AI assistants understand the codebase quickly and work effectively within it.`;

      await sendMessage(analysisPrompt);
    } else {
      addMessage({
        role: 'system',
        content: 'Error: Unable to initiate codebase analysis. sendMessage function not available.',
      });
    }
  }
};