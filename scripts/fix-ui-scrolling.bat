@echo off
echo =================================================================
echo                FIX UI SCROLLING ISSUES
echo =================================================================
echo.
echo The user interface has been updated to fix the sidebar scrolling:
echo  - Tool list will now scroll independently
echo  - Sidebar will remain visible during chat
echo  - Fixed various overflow issues
echo.
echo Starting Ollama-MCP Bridge with updated web interface...
echo.
echo Your bridge UI will be available at http://localhost:8080 
echo (or another port if 8080 is in use - check console output)
echo.
echo Press Ctrl+C to stop the server when finished.
echo.
npm run start
