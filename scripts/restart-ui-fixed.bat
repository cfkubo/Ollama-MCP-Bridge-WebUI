@echo off
echo =================================================================
echo                RESTART WITH FIXED UI
echo =================================================================
echo.
echo The user interface has been updated to fix the dropdown issue:
echo  - Clicking the tool name will insert it in the input
echo  - Clicking the arrow button will toggle the description
echo  - Visual styling has been improved
echo.
echo Starting Ollama-MCP Bridge with updated web interface...
echo.
echo Your bridge UI will be available at http://localhost:8080 
echo (or another port if 8080 is in use - check console output)
echo.
echo Press Ctrl+C to stop the server when finished.
echo.
npm run start
