#!/bin/bash

echo "=============================================================================="
echo "                OLLAMA-MCP BRIDGE INSTALLER"
echo "=============================================================================="
echo
echo "This script will set up the Ollama-MCP Bridge environment by:"
echo " 1. Checking and installing prerequisites (Node.js and Ollama)"
echo " 2. Installing dependencies"
echo " 3. Creating the workspace directory"
echo " 4. Building the TypeScript project"
echo " 5. Setting up configuration"
echo
echo "Installation starting automatically..."

echo
echo "Step 1: Checking prerequisites..."
echo "-----------------------------------------------------------------------------"
echo "Checking for Node.js..."
if ! command -v node &> /dev/null; then
  echo "Node.js not found. Installing Node.js..."
  
  echo "Downloading Node.js installer..."
  curl -L -o nodejs_installer.tar.gz https://nodejs.org/dist/v20.10.0/node-v20.10.0-darwin-x64.tar.gz
  
  echo "Extracting Node.js..."
  tar -xzf nodejs_installer.tar.gz -C /usr/local
  echo "Cleaning up..."
  rm nodejs_installer.tar.gz
  
  echo "Verifying Node.js installation..."
  if ! command -v node &> /dev/null; then
    echo "Failed to install Node.js. Please install it manually from https://nodejs.org/"
    echo "Then run this script again."
    read -p "Press Enter to continue..."
    exit 1
  fi
  echo "Node.js installed successfully."
else
  echo "Node.js is installed: $(node --version)"
fi

echo
echo "Checking for Ollama..."
if ! command -v ollama &> /dev/null; then
  echo "Ollama not found. Installing Ollama..."
  
  echo "Downloading Ollama installer..."
  curl -L -o ollama_installer.tar.gz https://ollama.com/download/ollama-darwin-amd64.tar.gz
  
  echo "Extracting Ollama..."
  tar -xzf ollama_installer.tar.gz -C /usr/local
  echo "Cleaning up..."
  rm ollama_installer.tar.gz
  
  echo "Verifying Ollama installation..."
  if ! command -v ollama &> /dev/null; then
    echo "Failed to install Ollama. Please install it manually from https://ollama.com/download"
    echo "Then run this script again."
    read -p "Press Enter to continue..."
    exit 1
  fi
  echo "Ollama installed successfully."
else
  echo "Ollama is installed."
fi

echo
echo "Step 2: Installing NPM dependencies..."
echo "-----------------------------------------------------------------------------"
npm install
if [ $? -ne 0 ]; then
  echo
  echo "Failed to install dependencies. Please check the error messages above."
  echo
  read -p "Press Enter to continue..."
  exit 1
fi
echo "Dependencies installed successfully."
echo

echo "Step 3: Creating workspace directory and .env file..."
echo "-----------------------------------------------------------------------------"
WORKSPACE_DIR="$PWD/../workspace"
if [ ! -d "$WORKSPACE_DIR" ]; then
  echo "Creating $WORKSPACE_DIR..."
  mkdir -p "$WORKSPACE_DIR"
  echo "Workspace directory created successfully."
else
  echo "Workspace directory already exists."
fi

if [ ! -f ".env" ]; then
  echo "Creating .env file from template..."
  if [ -f ".env.template" ]; then
    cp .env.template .env
    echo ".env created. You'll need to update it with your settings."
  else
    echo "# API Keys for various MCPs" > .env
    echo "# If you don't have keys for some services, those specific MCPs won't work" >> .env
    echo "# but the bridge will still function with available MCPs" >> .env
    echo "" >> .env
    echo "# Brave Search API key" >> .env
    echo "BRAVE_API_KEY=your_brave_key_here" >> .env
    echo "" >> .
    echo "# Note: Workspace directory is configured as an absolute path in the configuration" >> .env
    echo "" >> .env
    echo "# Add any other environment variables for new MCPs here" >> .env
    echo ".env file created with default template."
  fi
else
  echo ".env file already exists."
fi
echo

echo "Step 4: Setting up configuration..."
echo "-----------------------------------------------------------------------------"
CURR_DIR="$PWD"
WORKSPACE_DIR_FORWARD=$(echo "$WORKSPACE_DIR" | sed 's/\//\\/g')

if [ ! -f "bridge_config.json" ]; then
  echo "Creating bridge_config.json with absolute paths..."
  cat <<EOF > bridge_config.json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": [
        "$CURR_DIR/node_modules/@modelcontextprotocol/server-filesystem/dist/index.js",
        "$WORKSPACE_DIR_FORWARD"
      ],
      "allowedDirectory": "$WORKSPACE_DIR_FORWARD"
    },
    "brave-search": {
      "command": "node",
      "args": [
        "$CURR_DIR/node_modules/@modelcontextprotocol/server-brave-search/dist/index.js"
      ],
      "env": {
        "BRAVE_API_KEY": "\$BRAVE_API_KEY"
      }
    },
    "sequential-thinking": {
      "command": "node",
      "args": [
        "$CURR_DIR/node_modules/@modelcontextprotocol/server-sequential-thinking/dist/index.js"
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
EOF
  echo "bridge_config.json created with absolute paths."
else
  echo "bridge_config.json exists, updating with absolute paths..."
  sed -i '' 's/\.\//'"$CURR_DIR"'/g' bridge_config.json
  sed -i '' 's/\.\.\//'"$WORKSPACE_DIR_FORWARD"'/g' bridge_config.json
  echo "bridge_config.json updated with absolute paths."
fi
echo

echo "Step 5: Building the TypeScript project..."
echo "-----------------------------------------------------------------------------"
npm run build
if [ $? -ne 0 ]; then
  echo
  echo "Failed to build the project. Please check the error messages above."
  echo
  read -p "Press Enter to continue..."
  exit 1
fi
echo "Project built successfully."
echo

echo "Step 6: Downloading LLM model..."
echo "-----------------------------------------------------------------------------"
echo "Checking if Qwen model is available..."
if ! ollama list | grep -q "qwen2.5-coder:7b-instruct-q4_K_M"; then
  echo "Downloading Qwen model (this may take some time)..."
  ollama pull qwen2.5-coder:7b-instruct-q4_K_M
  echo "Model downloaded."
else
  echo "Qwen model is already available."
fi
echo

echo "=============================================================================="
echo "                     INSTALLATION COMPLETE"
echo "=============================================================================="
echo
echo "The Ollama-MCP Bridge has been set up successfully!"
echo
echo "Next steps:"
echo " 1. Update .env file with your API keys (if needed)"
echo " 2. To start the bridge, run: start.sh"
echo
echo "Documentation is available in the README.md file."
echo