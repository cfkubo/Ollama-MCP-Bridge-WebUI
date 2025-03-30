@echo off
echo =================================================================
echo                OLLAMA-MCP-BRIDGE CONFIG UPDATE TOOL
echo =================================================================
echo.

echo Step 1: Rebuilding the TypeScript project...
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
echo Step 2: Verifying JSON configuration file...
echo -----------------------------------------------------------------
node -e "try { const fs=require('fs'); const config=JSON.parse(fs.readFileSync('bridge_config.json','utf8')); console.log('✅ JSON syntax is valid'); } catch(e) { console.log('❌ JSON syntax error: ' + e.message); process.exit(1); }"

if %errorlevel% neq 0 (
  echo.
  echo Please fix the JSON syntax errors in bridge_config.json
  echo.
  pause
  exit /b 1
)

echo.
echo Step 3: Checking current configuration...
echo -----------------------------------------------------------------
echo Available MCP Servers in your configuration:
node -e "const fs=require('fs'); const config=JSON.parse(fs.readFileSync('bridge_config.json','utf8')); console.log(Object.keys(config.mcpServers).join(', '));"
echo.

echo Configuration update complete!
echo Please restart the bridge with "npm run start" to apply changes.
echo.
pause
