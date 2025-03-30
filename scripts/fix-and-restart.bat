@echo off
echo =================================================================
echo              OLLAMA-MCP-BRIDGE FIX AND RESTART TOOL
echo =================================================================
echo.

echo Step 1: Checking installed MCP modules...
echo -----------------------------------------------------------------
node -e "const fs=require('fs');const path=require('path');const mcps=fs.readdirSync(path.join(__dirname,'node_modules','@modelcontextprotocol')).forEach(m=>console.log(`Found: ${m}`));"
echo.

echo Step 2: Creating workspace directory if needed...
echo -----------------------------------------------------------------
if not exist "C:\Users\ryu\mcp_local\workspace" (
  echo Creating C:\Users\ryu\mcp_local\workspace...
  mkdir "C:\Users\ryu\mcp_local\workspace"
) else (
  echo Workspace directory already exists.
)
echo.

echo Step 3: Building the project...
echo -----------------------------------------------------------------
call npm run build
echo.

echo Step 4: Launching the bridge...
echo -----------------------------------------------------------------
echo Your bridge UI will be available at http://localhost:8080 
echo (or another port if 8080 is in use - check console output)
echo.
echo Press Ctrl+C to stop the server when finished.
echo.
npm run start
