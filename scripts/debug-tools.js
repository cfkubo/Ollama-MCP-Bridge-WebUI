// Debug tool loading
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('Debugging tool loading for MCP Bridge...\n');

// 1. Check Node.js version
console.log('Node.js version:');
console.log(process.version);
console.log('');

// 2. Check installed MCP modules
console.log('Installed MCP modules:');
const mcpPath = path.join(__dirname, 'node_modules', '@modelcontextprotocol');
if (fs.existsSync(mcpPath)) {
  const mcps = fs.readdirSync(mcpPath);
  mcps.forEach(mcp => {
    const packagePath = path.join(mcpPath, mcp, 'package.json');
    if (fs.existsSync(packagePath)) {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      console.log(`- ${mcp} (${pkg.version})`);
    } else {
      console.log(`- ${mcp} (version unknown)`);
    }
  });
} else {
  console.log('No MCP modules found at:', mcpPath);
}
console.log('');

// 3. Check if dist directories exist
console.log('Checking MCP dist directories:');
if (fs.existsSync(mcpPath)) {
  const mcps = fs.readdirSync(mcpPath);
  mcps.forEach(mcp => {
    const distPath = path.join(mcpPath, mcp, 'dist');
    if (fs.existsSync(distPath)) {
      console.log(`- ${mcp}: dist directory exists`);
      // List index.js
      const indexPath = path.join(distPath, 'index.js');
      if (fs.existsSync(indexPath)) {
        console.log(`  - index.js exists (${fs.statSync(indexPath).size} bytes)`);
      } else {
        console.log(`  - index.js NOT FOUND`);
      }
    } else {
      console.log(`- ${mcp}: dist directory MISSING`);
    }
  });
}
console.log('');

// 4. Check workspace directory
const workspacePath = 'C:/Users/ryu/mcp_local/workspace';
console.log(`Checking workspace directory (${workspacePath}):`);
if (fs.existsSync(workspacePath)) {
  console.log('Workspace directory exists');
  
  // Create a test file
  const testFilePath = path.join(workspacePath, 'test.txt');
  try {
    fs.writeFileSync(testFilePath, 'Test file for MCP filesystem', 'utf8');
    console.log('Successfully created test file in workspace');
    fs.unlinkSync(testFilePath);
    console.log('Successfully deleted test file from workspace');
  } catch (error) {
    console.error('Error accessing workspace:', error.message);
  }
} else {
  console.log('Workspace directory does not exist');
  console.log('Attempting to create workspace directory...');
  try {
    fs.mkdirSync(workspacePath, { recursive: true });
    console.log('Successfully created workspace directory');
  } catch (error) {
    console.error('Failed to create workspace directory:', error.message);
  }
}
console.log('');

// 5. Check Brave API key
const configPath = path.join(__dirname, 'bridge_config.json');
console.log('Checking Brave API key from config:');
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (config.mcpServers && config.mcpServers['brave-search'] && config.mcpServers['brave-search'].env && config.mcpServers['brave-search'].env.BRAVE_API_KEY) {
    console.log('Brave API key is configured');
  } else {
    console.log('Brave API key is missing from configuration');
  }
} else {
  console.log('Config file not found at:', configPath);
}
console.log('');

// 6. Build the project
console.log('Building the project:');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('Build successful');
} catch (error) {
  console.error('Build failed');
}
console.log('');

console.log('Debug complete. Please run the bridge with npm run start to test.');
