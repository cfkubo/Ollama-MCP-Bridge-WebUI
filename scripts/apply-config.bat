@echo off
echo =================================================================
echo                 APPLY CONFIGURATION CHANGES
echo =================================================================
echo.

echo Step 1: Verifying JSON configuration file...
echo -----------------------------------------------------------------
node -e "try { const fs=require('fs'); const config=JSON.parse(fs.readFileSync('bridge_config.json','utf8')); console.log('✅ JSON syntax is valid'); console.log('Configured MCP servers: ' + Object.keys(config.mcpServers).join(', ')); } catch(e) { console.log('❌ JSON syntax error: ' + e.message); process.exit(1); }"

if %errorlevel% neq 0 (
  echo.
  echo Please fix the JSON syntax errors in bridge_config.json
  echo.
  pause
  exit /b 1
)

echo.
echo Step 2: Starting the bridge with your configuration...
echo -----------------------------------------------------------------
echo The bridge will now start using your exact configuration from bridge_config.json
echo No TypeScript rebuild is needed since we now read directly from the file.
echo.
echo Press Ctrl+C to stop the server when finished.
echo.
npm run start
