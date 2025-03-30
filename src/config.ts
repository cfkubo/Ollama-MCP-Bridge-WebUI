import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { logger } from './logger';
import { ServerParameters } from './types';

export interface BridgeConfigFile {
  mcpServers: {
    [key: string]: ServerParameters;
  };
  llm?: {
    model: string;
    baseUrl: string;
    apiKey?: string;
    temperature?: number;
    maxTokens?: number;
  };
  systemPrompt?: string;
}

// Define the workspace directory
const workspaceDir = path.join(os.homedir(), 'mcp_local', 'workspace');

// Create a default configuration for Windows
const DEFAULT_CONFIG: BridgeConfigFile = {
  mcpServers: {
    "sequential-thinking": {
      command: "node",
      args: [
        path.join(process.cwd(), 'node_modules', '@modelcontextprotocol', 'server-sequential-thinking', 'dist', 'index.js')
      ]
    }
  },
  llm: {
    model: "qwen2.5:3b",
    baseUrl: "http://localhost:11434",
    apiKey: "ollama",
    temperature: 0.7,
    maxTokens: 1000
  },
  systemPrompt: "You are a helpful assistant that can use tools to help answer questions."
};

export async function loadBridgeConfig(): Promise<BridgeConfigFile> {
  // Change to look for config in the project directory
  const projectDir = path.resolve(__dirname, '..');
  const configPath = path.join(projectDir, 'bridge_config.json');
  const envPath = path.join(projectDir, '.env');
  
  try {
    // Load environment variables
    try {
      const envData = await fs.readFile(envPath, 'utf-8');
      const envVars: Record<string, string> = {};
      
      // Parse .env file
      envData.split('\n').forEach(line => {
        // Skip comments and empty lines
        if (line.trim().startsWith('#') || !line.trim()) return;
        
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          envVars[key] = value;
        }
      });
      
      logger.info(`Loaded environment variables from ${envPath}`);
      
      // Load the config file
      const configData = await fs.readFile(configPath, 'utf-8');
      let configStr = configData;
      
      // Replace environment variable placeholders in the config
      Object.entries(envVars).forEach(([key, value]) => {
        const placeholder = `$${key}`;
        configStr = configStr.replace(new RegExp(placeholder, 'g'), value);
      });
      
      const config = JSON.parse(configStr);
      logger.info(`Loaded bridge configuration from ${configPath} with environment variables`);
      
      // Use the config exactly as provided in the JSON file
      // Only apply defaults if specific sections are missing
      if (!config.mcpServers) {
        logger.warn('No mcpServers defined in config, using defaults');
        config.mcpServers = DEFAULT_CONFIG.mcpServers;
      }
      
      if (!config.llm) {
        logger.warn('No LLM configuration defined in config, using defaults');
        config.llm = DEFAULT_CONFIG.llm;
      }
      
      if (!config.systemPrompt) {
        logger.warn('No system prompt defined in config, using default');
        config.systemPrompt = DEFAULT_CONFIG.systemPrompt;
      }

      // Log which MCP servers are being loaded
      logger.info(`Loading MCP servers: ${Object.keys(config.mcpServers).join(', ')}`);
      
      return config;
    } catch (envError) {
      logger.warn(`.env file not found or unable to be parsed: ${envError.message}`);
      
      // Continue loading config without env substitution
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);
      logger.info(`Loaded bridge configuration from ${configPath} without environment variables`);
      
      // Apply defaults for missing sections
      if (!config.mcpServers) config.mcpServers = DEFAULT_CONFIG.mcpServers;
      if (!config.llm) config.llm = DEFAULT_CONFIG.llm;
      if (!config.systemPrompt) config.systemPrompt = DEFAULT_CONFIG.systemPrompt;
      
      logger.info(`Loading MCP servers: ${Object.keys(config.mcpServers).join(', ')}`);
      return config;
    }
  } catch (error: any) {
    logger.warn(`Could not load bridge_config.json from ${configPath}, using defaults`);
    return DEFAULT_CONFIG;
  }
}