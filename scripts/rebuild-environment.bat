@echo off
echo =================================================================
echo                ENVIRONMENT VARIABLE UPDATER
echo =================================================================
echo.
echo This script rebuilds the project to apply the changes to 
echo environment variable handling in the configuration.
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

echo Step 2: Checking .env file...
echo -----------------------------------------------------------------
if not exist ".env" (
  echo Creating .env file from template...
  if exist ".env.template" (
    copy .env.template .env
    echo .env created. You'll need to update it with your API keys.
  ) else (
    echo Creating basic .env file...
    echo # API Keys for various MCPs> .env
    echo # If you don't have keys for some services, those specific MCPs won't work>> .env
    echo # but the bridge will still function with available MCPs>> .env
    echo.>> .env
    echo # Brave Search API key>> .env
    echo BRAVE_API_KEY=your_brave_key_here>> .env
    echo.>> .env
    echo # Add any other environment variables for new MCPs here>> .env
    echo .env file created with default template.
  )
) else (
  echo .env file already exists.
)
echo.

echo =================================================================
echo                        UPDATE COMPLETE
echo =================================================================
echo.
echo The environment variable handling has been updated:
echo  1. The bridge now reads variables from .env file
echo  2. It replaces $VARIABLE_NAME in the bridge_config.json
echo  3. Make sure your API keys are in the .env file
echo.
echo To start the bridge, run: start.bat
echo.
pause
