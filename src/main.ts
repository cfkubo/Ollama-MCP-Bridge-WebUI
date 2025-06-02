import readline from 'readline';
import { MCPLLMBridge } from './bridge';
import { loadBridgeConfig } from './config';
import { logger } from './logger';
import { exec } from 'child_process';
import { BridgeConfig } from './types';
import path from 'path';
import os from 'os';
import { WebServer } from './web-server';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function forceExit() {
  logger.info('Force exiting...');
  
  try {
    if (process.platform === 'win32') {
      exec('taskkill /F /IM ollama.exe', () => {});
      exec('netstat -ano | findstr ":11434"', (error: any, stdout: string) => {
        if (!error && stdout) {
          const pids = stdout.split('\n')
            .map(line => line.trim().split(/\s+/).pop())
            .filter(pid => pid && /^\d+$/.test(pid));
          
          pids.forEach(pid => {
            exec(`taskkill /F /PID ${pid}`, () => {});
          });
        }
      });
    } else {
      
      // exec('pkill -f ollama', () => {});
    }
  } catch (e) {
    // Ignore errors during force kill
  }

  setTimeout(() => process.exit(0), 1000);
}

async function main() {
  try {
    logger.info('Starting main.ts...');
    const configFile = await loadBridgeConfig();

    // Get the first MCP in mcpServers without any hardcoded fallback
    const mcpKeys = Object.keys(configFile.mcpServers);
    if (mcpKeys.length === 0) {
      logger.error('No MCP servers found in configuration');
      throw new Error('At least one MCP server must be configured in bridge_config.json');
    }
    
    const primaryMcpName = mcpKeys[0];
    const primaryMcp = configFile.mcpServers[primaryMcpName];
    
    // Log which MCP is being used as primary
    logger.info(`Using "${primaryMcpName}" as primary MCP`);

    // Create bridge config with the first MCP as primary
    const bridgeConfig: BridgeConfig = {
      mcpServer: primaryMcp,  // Primary MCP
      mcpServerName: primaryMcpName,
      mcpServers: configFile.mcpServers,     // All MCPs
      llmConfig: configFile.llm!,
      systemPrompt: configFile.systemPrompt
    };

    logger.info('Initializing bridge with MCPs:', Object.keys(configFile.mcpServers).join(', '));
    const bridge = new MCPLLMBridge(bridgeConfig);
    const initialized = await bridge.initialize();

    if (!initialized) {
      throw new Error('Failed to initialize bridge');
    }

    // Try multiple ports in case some are in use
    let webServer = null;
    const ports = [8080, 8085, 8090, 8095, 9000, 9005];
    let port = process.env.PORT ? parseInt(process.env.PORT) : ports[0];
    let webServerStarted = false;
    
    // If PORT was specified, only try that one
    if (process.env.PORT) {
      try {
        webServer = new WebServer(bridge, port);
        webServer.start();
        webServerStarted = true;
        logger.info(`Web interface is available at http://localhost:${port}`);
      } catch (error: any) {
        logger.error(`Failed to start web server on port ${port}: ${error.message}`);
      }
    } else {
      // Try each port in sequence
      for (const potentialPort of ports) {
        try {
          webServer = new WebServer(bridge, potentialPort);
          webServer.start();
          port = potentialPort;
          webServerStarted = true;
          logger.info(`Web interface is available at http://localhost:${port}`);
          break;
        } catch (error: any) {
          logger.error(`Failed to start web server on port ${potentialPort}: ${error.message}`);
        }
      }
    }

    if (!webServerStarted) {
      logger.warn('Could not start web server on any port. Web interface will not be available.');
    }

    logger.info('Bridge initialized successfully!');
    logger.info('Available commands:');
    logger.info('  list-tools: Show all available tools and their parameters');
    logger.info('  clear-history: Clear the conversation history');
    logger.info('  quit: Exit the program');
    logger.info('  Any other input will be sent to the LLM');

    let isClosing = false;

    while (!isClosing) {
      try {
        const userInput = await question("\nEnter your prompt (or 'list-tools' or 'quit'): ");
        
        if (userInput.toLowerCase() === 'quit') {
          isClosing = true;
          await bridge.close();
          if (webServer) {
            webServer.stop();
          }
          rl.close();
          forceExit();
          break;
        }

        if (userInput.toLowerCase() === 'list-tools') {
          await bridge.llmClient.listTools();
          continue;
        }

        if (userInput.toLowerCase() === 'clear-history') {
          bridge.clearConversationHistory();
          console.log('Conversation history cleared');
          continue;
        }

        logger.info('Processing user input...');
        const response = await bridge.processMessage(userInput);
        logger.info('Received response from bridge');
        console.log(`\nResponse: ${response}`);
      } catch (error: any) {
        logger.error(`Error occurred: ${error?.message || String(error)}`);
      }
    }
  } catch (error: any) {
    logger.error(`Fatal error: ${error?.message || String(error)}`);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  logger.info('Received SIGINT...');
  forceExit();
});

process.on('exit', () => {
  logger.info('Exiting process...');
});

if (require.main === module) {
  main().catch(error => {
    logger.error(`Unhandled error: ${error?.message || String(error)}`);
    forceExit();
  });
}

export { main };