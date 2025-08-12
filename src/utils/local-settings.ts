import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ProviderConfig } from '../core/providers/types.js';

interface Config {
  groqApiKey?: string;
  defaultModel?: string;
  providers?: Record<string, ProviderConfig>;
}

const CONFIG_DIR = '.corrin'; // In home directory
const CONFIG_FILE = 'local-settings.json';
const PROVIDERS_FILE = 'providers.json';

export class ConfigManager {
  private configPath: string;
  private providersPath: string;

  constructor() {
    const homeDir = os.homedir();
    this.configPath = path.join(homeDir, CONFIG_DIR, CONFIG_FILE);
    this.providersPath = path.join(homeDir, CONFIG_DIR, PROVIDERS_FILE);
  }

  private ensureConfigDir(): void {
    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }

  public getApiKey(): string | null {
    try {
      if (!fs.existsSync(this.configPath)) {
        return null;
      }

      const configData = fs.readFileSync(this.configPath, 'utf8');
      const config: Config = JSON.parse(configData);
      return config.groqApiKey || null;
    } catch (error) {
      console.warn('Failed to read config file:', error);
      return null;
    }
  }

  public setApiKey(apiKey: string): void {
    try {
      this.ensureConfigDir();

      let config: Config = {};
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        config = JSON.parse(configData);
      }

      config.groqApiKey = apiKey;

      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), {
        mode: 0o600 // Read/write for owner only
      });
    } catch (error) {
      throw new Error(`Failed to save API key: ${error}`);
    }
  }

  public clearApiKey(): void {
    try {
      if (!fs.existsSync(this.configPath)) {
        return;
      }

      const configData = fs.readFileSync(this.configPath, 'utf8');
      const config: Config = JSON.parse(configData);
      delete config.groqApiKey;

      if (Object.keys(config).length === 0) {
        fs.unlinkSync(this.configPath);
      } else {
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), {
          mode: 0o600
        });
      }
    } catch (error) {
      console.warn('Failed to clear API key:', error);
    }
  }

  public getDefaultModel(): string | null {
    try {
      if (!fs.existsSync(this.configPath)) {
        return null;
      }

      const configData = fs.readFileSync(this.configPath, 'utf8');
      const config: Config = JSON.parse(configData);
      return config.defaultModel || null;
    } catch (error) {
      console.warn('Failed to read default model:', error);
      return null;
    }
  }

  public setDefaultModel(model: string): void {
    try {
      this.ensureConfigDir();

      let config: Config = {};
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        config = JSON.parse(configData);
      }

      config.defaultModel = model;

      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), {
        mode: 0o600 // Read/write for owner only
      });
    } catch (error) {
      throw new Error(`Failed to save default model: ${error}`);
    }
  }

  public getProviders(): Record<string, ProviderConfig> {
    try {
      if (!fs.existsSync(this.providersPath)) {
        // Create providers.json with default structure if it doesn't exist
        this.ensureProvidersFile();
        return {};
      }

      const providersData = fs.readFileSync(this.providersPath, 'utf8');
      const data = JSON.parse(providersData);

      // Support both direct providers object and nested structure
      if (data.providers) {
        return data.providers;
      }
      return data;
    } catch (error) {
      console.warn('Failed to read providers config:', error);
      return {};
    }
  }

  private ensureProvidersFile(): void {
    try {
      this.ensureConfigDir();
      
      const defaultProvidersData = { providers: {} };
      fs.writeFileSync(this.providersPath, JSON.stringify(defaultProvidersData, null, 2), {
        mode: 0o600 // Read/write for owner only
      });
    } catch (error) {
      console.warn('Failed to create default providers.json:', error);
    }
  }

  public setProviders(providers: Record<string, ProviderConfig>): void {
    try {
      this.ensureConfigDir();

      const data = { providers };

      fs.writeFileSync(this.providersPath, JSON.stringify(data, null, 2), {
        mode: 0o600 // Read/write for owner only
      });
    } catch (error) {
      throw new Error(`Failed to save providers config: ${error}`);
    }
  }

  public addProvider(providerId: string, config: ProviderConfig): void {
    const providers = this.getProviders();
    providers[providerId] = config;
    this.setProviders(providers);
  }

  public removeProvider(providerId: string): boolean {
    const providers = this.getProviders();
    if (providerId in providers) {
      delete providers[providerId];
      this.setProviders(providers);
      return true;
    }
    return false;
  }

  public hasProviders(): boolean {
    const providers = this.getProviders();
    return Object.keys(providers).length > 0;
  }

  // Legacy support - get API key for specific provider or default to groq
  public getProviderApiKey(providerId: string): string | null {
    if (providerId === 'groq') {
      return this.getApiKey();
    }

    const providers = this.getProviders();
    const provider = providers[providerId];
    return provider?.api_key || null;
  }

  public setProviderApiKey(providerId: string, apiKey: string): void {
    if (providerId === 'groq') {
      this.setApiKey(apiKey);
      return;
    }

    const providers = this.getProviders();
    if (providers[providerId]) {
      providers[providerId].api_key = apiKey;
      this.setProviders(providers);
    }
  }
}