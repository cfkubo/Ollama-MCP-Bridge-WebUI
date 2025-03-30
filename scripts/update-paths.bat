@echo off
echo =================================================================
echo                PATH CONFIGURATION UPDATER
echo =================================================================
echo.
echo This script updates the configuration to use relative paths and 
echo environment variables instead of hard-coded absolute paths.
echo.

echo Step 1: Rebuilding TypeScript project...
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

echo Step 2: Checking if WORKSPACE_DIR is in .env file...
echo -----------------------------------------------------------------
set "FOUND_WORKSPACE_DIR="
if exist ".env" (
  findstr /C:"WORKSPACE_DIR" .env > nul 2>&1
  if %errorlevel% equ 0 (
    set FOUND_WORKSPACE_DIR=true
    echo WORKSPACE_DIR found in .env file.
  ) else (
    echo WORKSPACE_DIR not found in .env file. Adding it...
    echo.>> .env
    echo # Workspace directory path>> .env
    echo WORKSPACE_DIR=C:/Users/%USERNAME%/mcp_local/workspace>> .env
    echo WORKSPACE_DIR added to .env file.
  )
) else (
  echo .env file not found. Creating it...
  echo # API Keys for various MCPs> .env
  echo # If you don't have keys for some services, those specific MCPs won't work>> .env
  echo # but the bridge will still function with available MCPs>> .env
  echo.>> .env
  echo # Brave Search API key>> .env
  echo BRAVE_API_KEY=your_brave_key_here>> .env
  echo.>> .env
  echo # Workspace directory path>> .env
  echo WORKSPACE_DIR=C:/Users/%USERNAME%/mcp_local/workspace>> .env
  echo .env file created with WORKSPACE_DIR.
)
echo.

echo =================================================================
echo                        UPDATE COMPLETE
echo =================================================================
echo.
echo Your configuration now uses:
echo  1. Relative paths for MCP server modules (./node_modules/...)
echo  2. Environment variables for workspace paths ($WORKSPACE_DIR)
echo  3. Environment variables for API keys ($BRAVE_API_KEY)
echo.
echo To start the bridge, run: start.bat
echo.
pause
