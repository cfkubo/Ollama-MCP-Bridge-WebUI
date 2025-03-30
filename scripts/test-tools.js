// Tool detection test script
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Testing MCP tool detection...');

// Read the configuration file
const configPath = path.join(__dirname, 'bridge_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Test each MCP server
async function testMCP(name, mcpConfig) {
  return new Promise((resolve) => {
    console.log(`\nTesting MCP server: ${name}`);
    console.log(`Command: ${mcpConfig.command} ${mcpConfig.args.join(' ')}`);
    
    const env = {
      ...process.env,
      ...(mcpConfig.env || {})
    };
    
    const proc = spawn(mcpConfig.command, mcpConfig.args, { 
      env,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let errorOutput = '';
    
    proc.stdout.on('data', (data) => {
      output += data.toString();
      console.log(`[${name} stdout] ${data.toString().trim()}`);
    });
    
    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`[${name} stderr] ${data.toString().trim()}`);
    });
    
    proc.on('error', (error) => {
      console.error(`Error starting ${name}: ${error.message}`);
      resolve({ success: false, error: error.message });
    });
    
    // Give it a few seconds to start
    setTimeout(() => {
      if (errorOutput.includes('Error')) {
        resolve({ success: false, error: errorOutput });
      } else {
        resolve({ success: true, output });
      }
      proc.kill();
    }, 5000);
  });
}

async function runTests() {
  console.log('Starting MCP server tests...');
  
  for (const [name, mcpConfig] of Object.entries(config.mcpServers)) {
    const result = await testMCP(name, mcpConfig);
    console.log(`\nResult for ${name}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    if (!result.success) {
      console.error(`Error: ${result.error}`);
    }
  }
  
  console.log('\nAll tests completed');
}

runTests();
