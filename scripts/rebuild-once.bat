@echo off
echo =================================================================
echo                REBUILD TYPESCRIPT PROJECT
echo =================================================================
echo.
echo After this build, you can edit bridge_config.json directly without rebuilding.
echo Changes will be read directly from the file.
echo.

echo Building the TypeScript project...
call npm run build
if %errorlevel% neq 0 (
  echo.
  echo Build failed! Please check the error messages above.
  echo.
  pause
  exit /b 1
)

echo.
echo Build successful! 
echo.
echo You can now edit bridge_config.json directly and use apply-config.bat
echo to start the bridge with your changes. No more rebuilding needed!
echo.
pause
