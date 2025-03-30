@echo off
echo =================================================================
echo                RESTART WEB INTERFACE
echo =================================================================
echo.
echo Starting Ollama-MCP Bridge with updated web interface...
echo.
echo Your bridge UI will be available at http://localhost:8080 
echo (or another port if 8080 is in use - check console output)
echo.
echo Press Ctrl+C to stop the server when finished.
echo.
npm run start
