# Ollama-MCP Bridge WebUI

A TypeScript implementation that connects local LLMs (via Ollama) to Model Context Protocol (MCP) servers with a web interface. This bridge allows open-source models to use the same tools and capabilities as Claude, enabling powerful local AI assistants that run entirely on your own hardware.

![Screenshot of the WebUI](https://i.imgur.com/placeholder.png)

## Features

- **Multi-MCP Integration**: Connect multiple MCP servers simultaneously
- **Tool Detection**: Automatically identifies which tool to use based on queries
- **Web Interface**: Clean UI with collapsible tool descriptions
- **Comprehensive Toolset**: Filesystem, web search, and reasoning capabilities

## Setup

### Automatic Installation

The easiest way to set up the bridge is to use the included installation script:

```bash
./install.bat
```

This script will:
1. Check for and install Node.js if needed
2. Check for and install Ollama if needed
3. Install all dependencies
4. Create the workspace directory (../workspace)
5. Set up initial configuration
6. Build the TypeScript project
7. Download the Qwen model for Ollama

After running the script, you only need to:
1. Add your API keys to the `.env` file (the `$VARIABLE_NAME` references in the config will be replaced with actual values)

### Manual Setup

If you prefer to set up manually:

1. Install Ollama from [ollama.com/download](https://ollama.com/download)
2. Pull the Qwen model: `ollama pull qwen2.5-coder:7b-instruct-q4_K_M`
3. Install dependencies: `npm install`
4. Create a workspace directory: `mkdir ../workspace`
5. Configure API keys in `.env`
6. Build the project: `npm run build`

## Configuration

The bridge is configured through two main files:

### 1. bridge_config.json

This file defines MCP servers, LLM settings, and system prompt. Environment variables are referenced with `$VARIABLE_NAME` syntax.

Example:
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": [
        "To/Your/Directory/Ollama-MCP-Bridge-WebUI/node_modules/@modelcontextprotocol/server-filesystem/dist/index.js",
        "To/Your/Directory/Ollama-MCP-Bridge-WebUI/../workspace"
      ],
      "allowedDirectory": "To/Your/Directory/Ollama-MCP-Bridge-WebUI/../workspace"
    },
    "brave-search": {
      "command": "node",
      "args": [
        "To/Your/Directory/Ollama-MCP-Bridge-WebUI/node_modules/@modelcontextprotocol/server-brave-search/dist/index.js"
      ],
      "env": {
        "BRAVE_API_KEY": "$BRAVE_API_KEY"
      }
    },
    "sequential-thinking": {
      "command": "node",
      "args": [
        "To/Your/Directory/Ollama-MCP-Bridge-WebUI/node_modules/@modelcontextprotocol/server-sequential-thinking/dist/index.js"
      ]
    }
  },
  "llm": {
    "model": "qwen2.5-coder:7b-instruct-q4_K_M",
    "baseUrl": "http://localhost:11434",
    "apiKey": "ollama",
    "temperature": 0.7,
    "maxTokens": 8000
  },
  "systemPrompt": "You are a helpful assistant that can use various tools to help answer questions. You have access to three main tool groups: 1) Filesystem operations - for working with files and directories, 2) Brave search - for finding information on the web, 3) Sequential thinking for complex problem-solving. When a user asks a question that requires external information, real-time data, or file manipulation, you should use a tool rather than guessing or using only your pre-trained knowledge."
}

```

### 2. .env file

This file stores sensitive information like API keys:

```
# Brave Search API key
BRAVE_API_KEY=your_brave_key_here
```

The bridge will automatically replace `$BRAVE_API_KEY` in the configuration with the actual value from your `.env` file.

## Usage

### Starting the Bridge

Simply run:
```bash
./start.bat
```

This will start the bridge with the web interface.

### Web Interface

Open http://localhost:8080 (or the port shown in the console) in your browser to access the web interface.

## License

MIT License - See LICENSE file for details
