import { ChildProcess, exec as childExec } from 'child_process';
import { type LLMConfig } from './types';
import { logger } from './logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DynamicToolRegistry } from './tool-registry';
import { toolSchemas } from './types/tool-schemas';

const execAsync = promisify(childExec);

interface OllamaResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
}

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface ToolResponse {
  name?: string;
  arguments?: Record<string, unknown>;
  thoughts?: string;
}

export class LLMClient {
  private config: LLMConfig;
  private toolRegistry: DynamicToolRegistry | null = null;
  private currentTool: string | null = null;
  public tools: any[] = [];
  private messages: any[] = [];
  private conversationHistory: any[] = []; // Persistent conversation history
  public systemPrompt: string | null = null;
  public _originalSystemPrompt: string | null = null; // To store the enhanced system prompt
  private readonly toolSchemas: typeof toolSchemas = toolSchemas;
  private static REQUEST_TIMEOUT = 300000; // 5 minutes
  private ollamaRunning: boolean = false;
  private maxHistoryLength: number = 10; // Max number of message pairs to keep

  // Add this line to define the ollamaProcess property
  private ollamaProcess: ChildProcess | null = null;

  constructor(config: LLMConfig) {
    this.config = config;
    this.systemPrompt = config.systemPrompt || null;
    this.config.baseUrl = this.config.baseUrl.replace('localhost', '127.0.0.1');
    logger.debug(`Initializing Ollama client with baseURL: ${this.config.baseUrl}`);
  }

  setToolRegistry(registry: DynamicToolRegistry) {
    this.toolRegistry = registry;
    logger.debug('Tool registry set with tools:', registry.getAllTools());
  }

  public async listTools(): Promise<void> {
    logger.info('===== Available Tools =====');
    if (this.tools.length === 0) {
      logger.info('No tools available');
      return;
    }

    for (const tool of this.tools) {
      logger.info('\nTool Details:');
      logger.info(`Name: ${tool.function.name}`);
      logger.info(`Description: ${tool.function.description}`);
      if (tool.function.parameters) {
        logger.info('Parameters:');
        logger.info(JSON.stringify(tool.function.parameters, null, 2));
      }
      logger.info('------------------------');
    }
    logger.info(`Total tools available: ${this.tools.length}`);
  }

  private async testConnection(): Promise<boolean> {
    try {
      logger.debug('Testing connection to Ollama...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        logger.debug('Ollama connection test successful:', data);
        return true;
      } else {
        logger.error('Ollama connection test failed with status:', response.status);
        return false;
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          logger.error('Ollama connection test timed out after 5 seconds');
        } else {
          logger.error('Ollama connection test failed with error:', error.message);
        }
      }
      return false;
    }
  }

  private async startOllama(): Promise<boolean> {
    if (this.ollamaRunning) {
      logger.debug('Ollama is already running');
      return true;
    }

    logger.debug('Starting Ollama...');
    try {
      // First ensure no existing Ollama process is running
      await this.forceKillOllama();
      
      // Start a new Ollama process - with the same options for all platforms
      this.ollamaProcess = exec('ollama serve', { windowsHide: true });

      if (this.ollamaProcess) {
        this.ollamaProcess.stdout?.on('data', (data) => {
            logger.debug('Ollama stdout:', data.toString());
        });

        this.ollamaProcess.stderr?.on('data', (data) => {
            logger.debug('Ollama stderr:', data.toString());
        });

        this.ollamaProcess.on('error', (error) => {
            logger.error('Error starting Ollama:', error);
            this.ollamaRunning = false;
        });

        this.ollamaProcess.on('exit', (code) => {
            logger.debug(`Ollama process exited with code ${code}`);
            this.ollamaRunning = false;
        });

        this.ollamaProcess.unref();
      }

      // Wait for Ollama to be ready
      let connected = false;
      for (let i = 0; i < 10; i++) {
        logger.debug(`Waiting for Ollama to start (attempt ${i + 1}/10)...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (await this.testConnection()) {
          logger.debug('Ollama is ready and responding');
          connected = true;
          this.ollamaRunning = true;
          break;
        }
      }

      if (!connected) {
        logger.error('Failed to start Ollama after 10 attempts');
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error starting Ollama:', error);
      return false;
    }
  }

  clearConversationHistory(): void {
    this.conversationHistory = [];
    logger.info('Conversation history cleared');
  }

  private async forceKillOllama(): Promise<void> {
    try {
      logger.debug('Starting Ollama cleanup process...');
      
      try {
        logger.debug('Attempting to kill Ollama by process name...');
        if (process.platform === 'win32') {
          const { stdout: killOutput } = await execAsync('taskkill /F /IM ollama.exe');
          logger.debug('Taskkill output:', killOutput);
        } else {
          const { stdout: killOutput } = await execAsync('pkill -f ollama');
          logger.debug('Pkill output:', killOutput);
        }
      } catch (e) {
        logger.debug('No Ollama process found to kill');
      }
      
      try {
        logger.debug('Checking for processes on port 11434...');
        let cmd = '';
        let pidExtractor: (line: string) => string | undefined;
        
        if (process.platform === 'win32') {
          cmd = 'netstat -ano | findstr ":11434"';
          pidExtractor = (line) => {
            const parts = line.trim().split(/\s+/);
            return parts[parts.length - 1];
          };
        } else {
          cmd = 'lsof -i :11434 | grep LISTEN';
          pidExtractor = (line) => {
            const parts = line.trim().split(/\s+/);
            return parts[1];
          };
        }
        
        const { stdout } = await execAsync(cmd);
        const lines = stdout.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          const pid = pidExtractor(line);
          if (pid && /^\d+$/.test(pid)) {
            logger.debug(`Killing process with PID ${pid}...`);
            if (process.platform === 'win32') {
              await execAsync(`taskkill /F /PID ${pid}`);
            } else {
              await execAsync(`kill -9 ${pid}`);
            }
          }
        }
      } catch (e) {
        logger.debug('No processes found on port 11434');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      logger.debug('Ollama cleanup process completed');
      this.ollamaRunning = false;
    } catch (error) {
      logger.error('Error during Ollama force kill:', error);
    }
  }

  private prepareMessages(): any[] {
    const formattedMessages = [];
    
    // Add system prompt
    if (this.systemPrompt) {
      formattedMessages.push({
        role: 'system',
        content: this.systemPrompt
      });
    }
    
    // Add conversation history (excluding the current message which is in this.messages)
    const historyToInclude = this.conversationHistory.slice(0, -1);
    formattedMessages.push(...historyToInclude);
    
    // Add current message
    formattedMessages.push(...this.messages);
    
    logger.debug(`Prepared ${formattedMessages.length} messages for LLM request`);
    return formattedMessages;
  }

  async invokeWithPrompt(prompt: string) {
    // Start Ollama if it's not already running
    if (!this.ollamaRunning) {
      const success = await this.startOllama();
      if (!success) {
        throw new Error('Failed to start Ollama');
      }
    }

    // Detect tool using registry if available
    if (this.toolRegistry) {
      this.currentTool = this.toolRegistry.detectToolFromPrompt(prompt);
      logger.debug(`Detected tool from registry: ${this.currentTool}`);
    }

    logger.debug(`Preparing to send prompt: ${prompt}`);
    
    // Add new user message to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: prompt
    });
    
    // Prepare messages for this request, starting with system prompt and adding conversation history
    this.messages = [];
    this.messages.push({
      role: 'user',
      content: prompt
    });
    
    // Limit history length if needed
    if (this.conversationHistory.length > this.maxHistoryLength * 2) { // *2 because we count pairs of messages
      const excess = this.conversationHistory.length - this.maxHistoryLength * 2;
      this.conversationHistory = this.conversationHistory.slice(excess);
      logger.debug(`Trimmed conversation history to ${this.conversationHistory.length} messages`);
    }

    return this.invoke([]);
  }

  async invoke(toolResults: any[] = []) {
    try {
      if (!this.ollamaRunning) {
        const success = await this.startOllama();
        if (!success) {
          throw new Error('Failed to start Ollama');
        }
      }

      if (toolResults.length > 0) {
        for (const result of toolResults) {
          const toolOutput = result.output;
          try {
            const parsedOutput = JSON.parse(toolOutput);
            if (parsedOutput.content && Array.isArray(parsedOutput.content)) {
              // Extract text content from MCP response
              const content = parsedOutput.content
                .filter((item: any) => item.type === 'text')
                .map((item: any) => item.text)
                .join('\n');
              
              const toolMessage = {
                role: 'tool',
                content,
                tool_call_id: result.tool_call_id
              };
              
              this.messages.push(toolMessage);
              this.conversationHistory.push(toolMessage);
            } else {
              const toolMessage = {
                role: 'tool',
                content: String(toolOutput),
                tool_call_id: result.tool_call_id
              };
              
              this.messages.push(toolMessage);
              this.conversationHistory.push(toolMessage);
            }
          } catch (e) {
            // If not JSON, use as-is
            const toolMessage = {
              role: 'tool',
              content: String(toolOutput),
              tool_call_id: result.tool_call_id
            };
            
            this.messages.push(toolMessage);
            this.conversationHistory.push(toolMessage);
          }
        }
      }

      const messages = this.prepareMessages();
      const payload: any = {
        model: this.config.model,
        messages: [],  // Start with an empty array for structured messages
        stream: false,
        options: {
          temperature: this.config.temperature || 0,
          num_predict: this.config.maxTokens || 1000
        }
      };

      // Add the messages
      for (const message of messages) {
        if (message.role === 'tool') {
          payload.messages.push({
            role: message.role,
            content: message.content,
            tool_call_id: message.tool_call_id
          });
        } else {
          payload.messages.push({
            role: message.role,
            content: message.content
          });
        }
      }

      // Add structured output format if a tool is detected
      if (this.currentTool) {
        const toolSchema = this.currentTool ? this.toolSchemas[this.currentTool as keyof typeof toolSchemas] : null;
        if (toolSchema) {
          payload.format = {
            type: "object",
            properties: {
              name: {
                type: "string",
                const: this.currentTool
              },
              arguments: toolSchema,
              thoughts: {
                type: "string",
                description: "Your thoughts about using this tool"
              }
            },
            required: ["name", "arguments", "thoughts"]
          };
          logger.debug('Added format schema for tool:', this.currentTool);
          logger.debug('Schema:', JSON.stringify(payload.format, null, 2));
        }
      }

      logger.debug('Preparing Ollama request with payload:', JSON.stringify(payload, null, 2));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        logger.error(`Request timed out after ${LLMClient.REQUEST_TIMEOUT/1000} seconds`);
      }, LLMClient.REQUEST_TIMEOUT);

      logger.debug('Sending request to Ollama...');
      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Ollama request failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }

      logger.debug('Response received from Ollama, parsing...');
      const completion = await response.json() as OllamaResponse;
      logger.debug('Parsed response:', completion);

      let isToolCall = false;
      let toolCalls: ToolCall[] = [];
      let content: any = completion.message.content;

      // Parse the structured response
      try {
        if (typeof content === 'string' && content.startsWith('```json')) {
          content = content.replace(/^```json/, '').replace(/```$/, '').trim();
          logger.debug('Cleaned Markdown response:', content);
        }
        const contentObj = typeof content === 'string' ? JSON.parse(content) : content;
        
        if (contentObj.name && contentObj.arguments) {
          isToolCall = true;
          toolCalls = [{
            id: `call-${Date.now()}`,
            function: {
              name: contentObj.name,
              arguments: JSON.stringify(contentObj.arguments)
            }
          }];
          content = contentObj.thoughts || "Using tool...";
          logger.debug('Parsed structured tool call:', { toolCalls });
        }
      } catch (e) {
        logger.debug('Response is not a structured tool call:', e);
      }

      const result = {
        content: typeof content === 'string' ? content : JSON.stringify(content),
        isToolCall,
        toolCalls
      };

      // Create the assistant response message
      const assistantMessage = result.isToolCall 
        ? {
            role: 'assistant',
            content: result.content,
            tool_calls: result.toolCalls?.map(call => ({
              id: call.id,
              type: 'function',
              function: {
                name: call.function.name,
                arguments: call.function.arguments
              }
            }))
          }
        : {
            role: 'assistant',
            content: result.content
          };
      
      // Add to current messages
      this.messages.push(assistantMessage);
      
      // Also add to conversation history for future context
      this.conversationHistory.push(assistantMessage);
      
      logger.debug(`Conversation history now has ${this.conversationHistory.length} messages`);

      return result;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logger.error('Request aborted due to timeout');
        throw new Error(`Request timed out after ${LLMClient.REQUEST_TIMEOUT/1000} seconds`);
      }
      logger.error('LLM invocation failed:', error);
      throw error;
    }
  }
}