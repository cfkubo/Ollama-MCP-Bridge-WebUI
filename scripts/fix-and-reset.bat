@echo off
echo =================================================================
echo                 COMPLETE RESET AND REBUILD
echo =================================================================
echo.

echo Step 1: Running diagnostics...
echo -----------------------------------------------------------------
node diagnostic.js
echo.

echo Step 2: Removing old build artifacts...
echo -----------------------------------------------------------------
if exist "dist" (
  echo Removing dist directory...
  rmdir /s /q dist
  echo Done.
) else (
  echo No dist directory found.
)
echo.

echo Step 3: Rebuilding TypeScript project...
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

echo Step 4: Re-run diagnostics...
echo -----------------------------------------------------------------
node diagnostic.js
echo.

echo Step 5: Starting server...
echo -----------------------------------------------------------------
echo Starting server with npm run start...
echo Your bridge UI will be available at http://localhost:8080 
echo (or another port if 8080 is in use - check console output)
echo.
echo Press Ctrl+C to stop the server when finished.
echo.
npm run start
