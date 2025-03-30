import { logger } from './logger';

export interface MCPDefinition {
  name: string;
  command: string;
  args: string[];
  allowedDirectory?: string;
  env?: Record<string, string>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export class MCPRegistry {
  private mcps: Map<string, MCPDefinition> = new Map();

  registerMCP(name: string, definition: MCPDefinition) {
    this.mcps.set(name, definition);
    logger.info(`Registered MCP: ${name}`);
  }

  getMCP(name: string): MCPDefinition | undefined {
    return this.mcps.get(name);
  }

  convertToolToOpenAI(mcpTool: MCPTool) {
    logger.debug(`Converting MCP tool to OpenAI format: ${mcpTool.name}`);
    return {
      type: 'function',
      function: {
        name: this.sanitizeToolName(mcpTool.name),
        description: mcpTool.description,
        parameters: mcpTool.inputSchema
      }
    };
  }

  convertResponseToOpenAI(mcpResponse: any) {
    // Handle different types of MCP responses
    if (typeof mcpResponse === 'string') {
      return { content: mcpResponse };
    }

    // Handle tool-specific responses
    if (mcpResponse.content && Array.isArray(mcpResponse.content)) {
      const content = mcpResponse.content
        .map((item: any) => {
          if (item.type === 'text') return item.text;
          if (item.type === 'image') return `[Image: ${item.url}]`;
          return JSON.stringify(item);
        })
        .join('\n');
      return { content };
    }

    // Default to stringifying the response
    return { content: JSON.stringify(mcpResponse) };
  }

  private sanitizeToolName(name: string): string {
    return name.replace(/[-\s]/g, '_').toLowerCase();
  }

  // Load MCPs from a configuration object
  loadFromConfig(config: Record<string, any>) {
    for (const [name, definition] of Object.entries(config.mcpServers)) {
      this.registerMCP(name, definition as MCPDefinition);
    }
    logger.info(`Loaded ${this.mcps.size} MCPs from config`);
  }

  // List all registered MCPs
  listMCPs(): string[] {
    return Array.from(this.mcps.keys());
  }

  // Get default parameters for specific tool types
  getDefaultParams(toolName: string): Record<string, any> {
    const defaults: Record<string, Record<string, any>> = {
      'generate_image': {
        megapixels: "1",
        aspect_ratio: "1:1"
      },
      // Add more tool-specific defaults as needed
    };
    
    return defaults[toolName] || {};
  }

  // Add tool-specific parameter validation
  validateToolParams(toolName: string, params: Record<string, any>): Record<string, any> {
    const defaults = this.getDefaultParams(toolName);
    const validated = { ...defaults, ...params };

    // Tool-specific validation rules
    switch(toolName) {
      case 'generate_image':
        if (!['1', '0.25'].includes(validated.megapixels)) {
          validated.megapixels = '1';
        }
        break;
      // Add more tool-specific validation as needed
    }

    return validated;
  }
}
