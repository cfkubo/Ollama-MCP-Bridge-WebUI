@echo off
echo =================================================================
echo            REMOVE HARDCODED SEQUENTIAL THINKING
echo =================================================================
echo.

echo Step 1: Removing old build artifacts...
echo -----------------------------------------------------------------
if exist "dist" (
  echo Removing dist directory...
  rmdir /s /q dist
  echo Done.
) else (
  echo No dist directory found.
)
echo.

echo Step 2: Rebuilding TypeScript project...
echo -----------------------------------------------------------------
call npm run build
if %errorlevel% neq 0 (
  echo.
  echo Build failed! Please check the error messages above.
  echo.
  pause
  exit /b 1
)
echo.

echo Step 3: Verification...
echo -----------------------------------------------------------------
echo Your configuration now uses the first MCP in your config file as the primary MCP.
echo The MCPs in your config file (in order) are:
node -e "const fs=require('fs');const config=JSON.parse(fs.readFileSync('bridge_config.json','utf8'));console.log(Object.keys(config.mcpServers).join(', '));"
echo.
echo The first MCP will be used as primary. The others will be available but won't 
echo be the default choice.
echo.

echo Step 4: Starting server...
echo -----------------------------------------------------------------
echo Starting server with npm run start...
echo Your bridge UI will be available at http://localhost:8080 
echo (or another port if 8080 is in use - check console output)
echo.
echo Press Ctrl+C to stop the server when finished.
echo.
npm run start
