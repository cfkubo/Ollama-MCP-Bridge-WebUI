@echo off
echo =================================================================
echo                    WORKSPACE SETUP UTILITY
echo =================================================================
echo.
echo This script sets up the workspace directory for file operations.
echo.

echo Checking for workspace directory...
echo -----------------------------------------------------------------
set WORKSPACE_DIR=..\workspace
if not exist "%WORKSPACE_DIR%" (
  echo Creating %WORKSPACE_DIR%...
  mkdir "%WORKSPACE_DIR%"
  echo.
  echo Workspace directory created at: %CD%\..\workspace
) else (
  echo Workspace directory already exists at: %CD%\..\workspace
)

echo.
echo You can now use the filesystem tools to work with files in this directory.
echo For example:
echo  - list_directory: Show files in the workspace
echo  - write_file: Create a new file in the workspace
echo  - read_file: Read a file from the workspace
echo.
pause
