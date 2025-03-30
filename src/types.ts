export interface ServerParameters {
  command: string;
  args?: string[];
  allowedDirectory?: string;
  env?: Record<string, string>;
}

export interface LLMConfig {
  model: string;
  baseUrl: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface BridgeConfig {
  mcpServer: ServerParameters;        // Primary MCP
  mcpServers?: {                     // All MCPs including Flux, etc.
    [key: string]: ServerParameters;
  };
  mcpServerName: string;
  llmConfig: LLMConfig;
  systemPrompt?: string;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolMetadata {
  keywords: string[];   // Keywords that trigger this tool
  exampleArgs: any;     // Example arguments for this tool
  formatInstructions: string; // Specific format instructions
}

export interface ToolRegistry {
  [toolName: string]: MCPToolMetadata;
}