// Diagnostic script for MCP bridge tool loading
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('===================================================================');
console.log('                MCP BRIDGE DIAGNOSTIC TOOL                         ');
console.log('===================================================================');

// Read the config file
try {
  console.log('\nReading bridge_config.json...');
  const configPath = path.join(__dirname, 'bridge_config.json');
  const configContent = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(configContent);
  
  console.log(`\nMCP Servers in configuration (${Object.keys(config.mcpServers).length} total):`);
  Object.keys(config.mcpServers).forEach((name, index) => {
    console.log(`  ${index + 1}. ${name}`);
  });
  
  // Print the first server which will be used as primary
  if (Object.keys(config.mcpServers).length > 0) {
    const primaryName = Object.keys(config.mcpServers)[0];
    console.log(`\nPrimary MCP Server will be: ${primaryName}`);
  } else {
    console.log('\nWARNING: No MCP servers defined in configuration!');
  }
  
  // Find sequential-thinking in config
  const hasSequentialThinking = Object.keys(config.mcpServers).includes('sequential-thinking');
  if (hasSequentialThinking) {
    console.log('\nWARNING: "sequential-thinking" is still in your configuration!');
    console.log('This might be causing it to be selected as a primary MCP or loaded.');
  } else {
    console.log('\n"sequential-thinking" is not in your configuration (good).');
  }
  
} catch (error) {
  console.error(`\nError reading or parsing config: ${error.message}`);
}

// Check for compiled version
try {
  console.log('\nChecking for compiled files...');
  const distDir = path.join(__dirname, 'dist');
  
  if (fs.existsSync(distDir)) {
    console.log('Compiled "dist" directory exists.');
    
    // Check if main files are compiled
    const mainFile = path.join(distDir, 'main.js');
    const configFile = path.join(distDir, 'config.js');
    
    if (fs.existsSync(mainFile)) {
      console.log('✓ main.js is compiled');
      
      // Get file modification time
      const mainStats = fs.statSync(mainFile);
      const mainModified = new Date(mainStats.mtime);
      console.log(`  Last modified: ${mainModified.toLocaleString()}`);
    } else {
      console.log('✗ main.js is missing from dist directory');
    }
    
    if (fs.existsSync(configFile)) {
      console.log('✓ config.js is compiled');
      
      // Get file modification time
      const configStats = fs.statSync(configFile);
      const configModified = new Date(configStats.mtime);
      console.log(`  Last modified: ${configModified.toLocaleString()}`);
    } else {
      console.log('✗ config.js is missing from dist directory');
    }
  } else {
    console.log('WARNING: Compiled "dist" directory does not exist. Project may not be built.');
  }
} catch (error) {
  console.error(`\nError checking compiled files: ${error.message}`);
}

console.log('\n===================================================================');
console.log('RECOMMENDATION:');
console.log('1. Make sure "sequential-thinking" is NOT in your bridge_config.json');
console.log('2. Make sure the filesystem or brave-search is listed FIRST in mcpServers');
console.log('3. Run "npm run build" to rebuild the TypeScript files');
console.log('4. Restart the server with "npm run start"');
console.log('===================================================================\n');
