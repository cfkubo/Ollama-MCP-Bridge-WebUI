@echo off
echo =================================================================
echo               OLLAMA-MCP BRIDGE INSTALLER
echo =================================================================
echo.
echo This script will set up the Ollama-MCP Bridge environment by:
echo  1. Checking and installing prerequisites (Node.js and Ollama)
echo  2. Installing dependencies
echo  3. Creating the workspace directory
echo  4. Building the TypeScript project
echo  5. Setting up configuration
echo.
echo Installation starting automatically...

echo.
echo Step 1: Checking prerequisites...
echo -----------------------------------------------------------------
echo Checking for Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo Node.js not found. Installing Node.js...
  
  echo Downloading Node.js installer...
  curl -L -o nodejs_installer.msi https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi
  
  echo Installing Node.js...
  start /wait msiexec /i nodejs_installer.msi /qn
  
  echo Cleaning up...
  del nodejs_installer.msi
  
  echo Verifying Node.js installation...
  where node >nul 2>nul
  if %errorlevel% neq 0 (
    echo Failed to install Node.js. Please install it manually from https://nodejs.org/
    echo Then run this script again.
    pause
    exit /b 1
  )
  echo Node.js installed successfully.
) else (
  for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
  echo Node.js is installed: %NODE_VERSION%
)

echo.
echo Checking for Ollama...
where ollama >nul 2>nul
if %errorlevel% neq 0 (
  echo Ollama not found. Installing Ollama...
  
  echo Downloading Ollama installer...
  curl -L -o ollama_installer.exe https://ollama.com/download/ollama-installer.exe
  
  echo Installing Ollama...
  start /wait ollama_installer.exe
  
  echo Cleaning up...
  del ollama_installer.exe
  
  echo Verifying Ollama installation...
  where ollama >nul 2>nul
  if %errorlevel% neq 0 (
    echo Failed to install Ollama. Please install it manually from https://ollama.com/download
    echo Then run this script again.
    pause
    exit /b 1
  )
  echo Ollama installed successfully.
) else (
  echo Ollama is installed.
)

echo.
echo Step 2: Installing NPM dependencies...
echo -----------------------------------------------------------------
call npm install
if %errorlevel% neq 0 (
  echo.
  echo Failed to install dependencies. Please check the error messages above.
  echo.
  pause
  exit /b 1
)
echo Dependencies installed successfully.
echo.

echo Step 3: Creating workspace directory and .env file...
echo -----------------------------------------------------------------
rem Using absolute path for workspace directory to avoid path resolution issues
set WORKSPACE_DIR=%CD%\..\workspace
if not exist "%WORKSPACE_DIR%" (
  echo Creating %WORKSPACE_DIR%...
  mkdir "%WORKSPACE_DIR%"
  echo Workspace directory created successfully.
) else (
  echo Workspace directory already exists.
)

if not exist ".env" (
  echo Creating .env file from template...
  if exist ".env.template" (
    copy .env.template .env
    echo .env created. You'll need to update it with your settings.
  ) else (
    echo Creating basic .env file...
    echo # API Keys for various MCPs> .env
    echo # If you don't have keys for some services, those specific MCPs won't work>> .env
    echo # but the bridge will still function with available MCPs>> .env
    echo.>> .env
    echo # Brave Search API key>> .env
    echo BRAVE_API_KEY=your_brave_key_here>> .env
    echo.>> .env
    echo # Note: Workspace directory is configured as an absolute path in the configuration>> .env
    echo.>> .env
    echo # Add any other environment variables for new MCPs here>> .env
    echo .env file created with default template.
  )
) else (
  echo .env file already exists.
)
echo.

echo Step 4: Setting up configuration...
echo -----------------------------------------------------------------
set CURR_DIR=%CD%
set WORKSPACE_DIR=%CD%\..\workspace
set WORKSPACE_DIR_FORWARD=%WORKSPACE_DIR:\=/%

if not exist "bridge_config.json" (
  echo Creating bridge_config.json with absolute paths...
  echo {> bridge_config.json
  echo   "mcpServers": {>> bridge_config.json
  echo     "filesystem": {>> bridge_config.json
  echo       "command": "node",>> bridge_config.json
  echo       "args": [>> bridge_config.json
  echo         "%CURR_DIR:\=/%/node_modules/@modelcontextprotocol/server-filesystem/dist/index.js",>> bridge_config.json
  echo         "%WORKSPACE_DIR_FORWARD%">> bridge_config.json
  echo       ],>> bridge_config.json
  echo       "allowedDirectory": "%WORKSPACE_DIR_FORWARD%">> bridge_config.json
  echo     },>> bridge_config.json
  echo     "brave-search": {>> bridge_config.json
  echo       "command": "node",>> bridge_config.json
  echo       "args": [>> bridge_config.json
  echo         "%CURR_DIR:\=/%/node_modules/@modelcontextprotocol/server-brave-search/dist/index.js">> bridge_config.json
  echo       ],>> bridge_config.json
  echo       "env": {>> bridge_config.json
  echo         "BRAVE_API_KEY": "$BRAVE_API_KEY">> bridge_config.json
  echo       }>> bridge_config.json
  echo     },>> bridge_config.json
  echo     "sequential-thinking": {>> bridge_config.json
  echo       "command": "node",>> bridge_config.json
  echo       "args": [>> bridge_config.json
  echo         "%CURR_DIR:\=/%/node_modules/@modelcontextprotocol/server-sequential-thinking/dist/index.js">> bridge_config.json
  echo       ]>> bridge_config.json
  echo     }>> bridge_config.json
  echo   },>> bridge_config.json
  echo   "llm": {>> bridge_config.json
  echo     "model": "qwen2.5-coder:7b-instruct-q4_K_M",>> bridge_config.json
  echo     "baseUrl": "http://localhost:11434",>> bridge_config.json
  echo     "apiKey": "ollama",>> bridge_config.json
  echo     "temperature": 0.7,>> bridge_config.json
  echo     "maxTokens": 8000>> bridge_config.json
  echo   },>> bridge_config.json
  echo   "systemPrompt": "You are a helpful assistant that can use various tools to help answer questions. You have access to three main tool groups: 1) Filesystem operations - for working with files and directories, 2) Brave search - for finding information on the web, 3) Sequential thinking for complex problem-solving. When a user asks a question that requires external information, real-time data, or file manipulation, you should use a tool rather than guessing or using only your pre-trained knowledge.">> bridge_config.json
  echo }>> bridge_config.json
  echo bridge_config.json created with absolute paths.
) else (
  echo bridge_config.json exists, updating with absolute paths...
  powershell -Command "(Get-Content bridge_config.json) -replace './node_modules', '%CURR_DIR:\=/%/node_modules' | Set-Content bridge_config.json.tmp"
  powershell -Command "(Get-Content bridge_config.json.tmp) -replace 'node_modules', '%CURR_DIR:\=/%/node_modules' | Set-Content bridge_config.json.tmp2"
  powershell -Command "(Get-Content bridge_config.json.tmp2) -replace '../workspace', '%WORKSPACE_DIR_FORWARD%' | Set-Content bridge_config.json"
  del bridge_config.json.tmp
  del bridge_config.json.tmp2
  echo bridge_config.json updated with absolute paths.
)
echo.

echo Step 5: Building the TypeScript project...
echo -----------------------------------------------------------------
call npm run build
if %errorlevel% neq 0 (
  echo.
  echo Failed to build the project. Please check the error messages above.
  echo.
  pause
  exit /b 1
)
echo Project built successfully.
echo.

echo Step 6: Downloading LLM model...
echo -----------------------------------------------------------------
echo Checking if Qwen model is available...
for /f "tokens=*" %%i in ('ollama list ^| find "qwen2.5-coder:7b-instruct-q4_K_M"') do set MODEL_EXISTS=%%i
if not defined MODEL_EXISTS (
  echo Downloading Qwen model (this may take some time)...
  ollama pull qwen2.5-coder:7b-instruct-q4_K_M
  echo Model downloaded.
) else (
  echo Qwen model is already available.
)
echo.

echo =================================================================
echo                     INSTALLATION COMPLETE
echo =================================================================
echo.
echo The Ollama-MCP Bridge has been set up successfully!
echo.
echo Next steps:
echo  1. Update .env file with your API keys (if needed)
echo  2. To start the bridge, run: start.bat
echo.
echo Documentation is available in the README.md file.
echo.