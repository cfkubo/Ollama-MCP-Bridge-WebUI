import { MCPClient } from './mcp-client';
import { LLMClient } from './llm-client';
import { logger } from './logger';
import { BridgeConfig, Tool, ServerParameters } from './types';
import { DynamicToolRegistry } from './tool-registry';

interface MCPMap {
  [key: string]: MCPClient;
}

export interface MCPLLMBridge {
  tools: any[];
  llmClient: LLMClient;
  initialize(): Promise<boolean>;
  processMessage(message: string): Promise<string>;
  setTools(tools: any[]): Promise<void>;
  close(): Promise<void>;
}

export class MCPLLMBridge implements MCPLLMBridge {
  private config: BridgeConfig;
  private mcpClients: MCPMap = {};
  private toolToMcp: { [toolName: string]: MCPClient } = {};
  private toolRegistry: DynamicToolRegistry;
  public llmClient: LLMClient;
  public tools: any[] = [];

  constructor(private bridgeConfig: BridgeConfig) {
    this.config = bridgeConfig;
    // Primary MCP client
    this.mcpClients['primary'] = new MCPClient(bridgeConfig.mcpServer);
    this.llmClient = new LLMClient(bridgeConfig.llmConfig);
    this.toolRegistry = new DynamicToolRegistry();

    // Initialize other MCP clients if available
    if (bridgeConfig.mcpServers) {
      Object.entries(bridgeConfig.mcpServers).forEach(([name, config]) => {
        if (name !== bridgeConfig.mcpServerName) { // Skip primary as it's already initialized
          this.mcpClients[name] = new MCPClient(config);
        }
      });
    }
  }

  async initialize(): Promise<boolean> {
    try {
      logger.info('Connecting to MCP servers...');
      
      // Initialize all MCP clients
      for (const [name, client] of Object.entries(this.mcpClients)) {
        logger.info(`Connecting to MCP: ${name}`);
        await client.connect();
        
        const mcpTools = await client.getAvailableTools();
        logger.info(`Received ${mcpTools.length} tools from ${name}`);
        
        // Register tools and map them to this MCP
        mcpTools.forEach(tool => {
          this.toolRegistry.registerTool(tool);
          this.toolToMcp[tool.name] = client;
          logger.debug(`Registered tool ${tool.name} from ${name}`);
        });

        // Convert and add to tools list
        const convertedTools = this.convertMCPToolsToOpenAIFormat(mcpTools);
        this.tools.push(...convertedTools);
      }

      // Set tools in LLM client
      this.llmClient.tools = this.tools;
      this.llmClient.setToolRegistry(this.toolRegistry);
      
      // Generate enhanced system prompt with tool information
      if (this.config.systemPrompt) {
        const toolDescriptions = this.tools.map(tool => 
          `- ${tool.function.name}: ${tool.function.description || 'No description available'}`
        ).join('\n');
        
        const enhancedPrompt = `${this.config.systemPrompt}\n\nYou have access to the following tools:\n${toolDescriptions}\n\nWhen a user's request might benefit from using a tool, use the appropriate tool from the list above.`;
        
        this.llmClient.systemPrompt = enhancedPrompt;
        logger.info('Enhanced system prompt with tool information');
      }
      
      logger.info(`Initialized with ${this.tools.length} total tools`);
      logger.debug('Available tools:', this.tools.map(t => t.function.name).join(', '));
      
      return true;
    } catch (error: any) {
      logger.error(`Bridge initialization failed: ${error?.message || String(error)}`);
      return false;
    }
  }

  private convertMCPToolsToOpenAIFormat(mcpTools: Tool[]): any[] {
    return mcpTools.map(tool => {
      const converted = {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description || `Use the ${tool.name} tool`,
          parameters: {
            type: "object",
            properties: tool.inputSchema?.properties || {},
            required: tool.inputSchema?.required || []
          }
        }
      };
      logger.debug(`Converted tool ${tool.name}:`, JSON.stringify(converted, null, 2));
      return converted;
    });
  }

  async processMessage(message: string): Promise<string> {
    try {
      const detectedTool = this.toolRegistry.detectToolFromPrompt(message);
      logger.info(`Detected tool: ${detectedTool}`);

      if (detectedTool) {
        const instructions = this.toolRegistry.getToolInstructions(detectedTool);
        if (instructions) {
          // Store the original enhanced system prompt if not already saved
          if (!this.llmClient._originalSystemPrompt) {
            this.llmClient._originalSystemPrompt = this.llmClient.systemPrompt;
          }
          
          // Set tool-specific instructions
          this.llmClient.systemPrompt = instructions;
          logger.debug('Using tool-specific instructions:', instructions);
        }
      } else if (this.llmClient._originalSystemPrompt) {
        // Restore the enhanced system prompt if we're not using a specific tool
        this.llmClient.systemPrompt = this.llmClient._originalSystemPrompt;
      }

      logger.info('Sending message to LLM...');
      let response = await this.llmClient.invokeWithPrompt(message);
      logger.info(`LLM response received, isToolCall: ${response.isToolCall}`);
      logger.debug('Raw LLM response:', JSON.stringify(response, null, 2));

      while (response.isToolCall && response.toolCalls?.length) {
        logger.info(`Processing ${response.toolCalls.length} tool calls`);
        const toolResponses = await this.handleToolCalls(response.toolCalls);
        logger.info('Tool calls completed, sending results back to LLM');
        response = await this.llmClient.invoke(toolResponses);
      }

      return response.content;
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      logger.error(`Error processing message: ${errorMsg}`);
      return `Error processing message: ${errorMsg}`;
    }
  }

  public async handleToolCalls(toolCalls: any[]): Promise<any[]> {
    const toolResponses = [];

    for (const toolCall of toolCalls) {
      try {
        const requestedName = toolCall.function.name;
        logger.debug(`[MCP] Looking up tool name: ${requestedName}`);

        // Get appropriate MCP client for this tool
        const mcpClient = this.toolToMcp[requestedName];
        if (!mcpClient) {
          throw new Error(`No MCP found for tool: ${requestedName}`);
        }

        logger.info(`[MCP] About to call MCP tool: ${requestedName}`);
        let toolArgs = JSON.parse(toolCall.function.arguments);
        logger.info(`[MCP] Tool arguments prepared: ${JSON.stringify(toolArgs)}`);
        
        const mcpCallPromise = mcpClient.callTool(requestedName, toolArgs);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('MCP call timed out after 30 seconds')), 30000);
        });

        logger.info(`[MCP] Sending call to MCP...`);
        const result = await Promise.race([mcpCallPromise, timeoutPromise]);
        logger.info(`[MCP] Received response from MCP`);
        logger.debug(`[MCP] Tool result:`, result);
        
        toolResponses.push({
          tool_call_id: toolCall.id,
          output: typeof result === 'string' ? result : JSON.stringify(result)
        });
        
      } catch (error: any) {
        logger.error(`[MCP] Tool execution failed with error:`, error);
        toolResponses.push({
          tool_call_id: toolCall.id,
          output: `Error: ${error?.message || String(error)}`
        });
      }
    }

    return toolResponses;
  }

  async setTools(tools: any[]): Promise<void> {
    this.tools = tools;
    this.llmClient.tools = tools;
    this.toolRegistry = new DynamicToolRegistry();
    
    tools.forEach(tool => {
      if (tool.function) {
        this.toolRegistry.registerTool({
          name: tool.function.name,
          description: tool.function.description,
          inputSchema: tool.function.parameters
        });
      }
    });
  }

  clearConversationHistory(): void {
    this.llmClient.clearConversationHistory();
  }

  async close(): Promise<void> {
    for (const client of Object.values(this.mcpClients)) {
      await client.close();
    }
  }
}