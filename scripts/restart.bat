@echo off
echo Building and restarting the bridge...
echo.

echo Building TypeScript...
call npm run build

echo.
echo Starting the bridge...
call npm run start
