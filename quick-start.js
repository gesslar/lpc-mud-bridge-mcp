#!/usr/bin/env node

/**
 * Quick Start Script for MUD Bridge MCP Server
 * Interactive helper to get up and running quickly
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import readline from 'readline';
import c from '@gesslar/colours';

// Set up semantic color aliases
c.alias.set('title', '{F045}{<B}');
c.alias.set('success', '{F034}');
c.alias.set('error', '{F196}');
c.alias.set('warning', '{F214}');
c.alias.set('info', '{F045}');
c.alias.set('muted', '{F240}');
c.alias.set('highlight', '{F213}');
c.alias.set('cyan', '{F051}');
c.alias.set('magenta', '{F201}');

class QuickStart {
  constructor() {
    this.mudHost = process.env.MUD_HOST || 'localhost';
    this.mudPort = process.env.MUD_PORT || '8383';
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.mcpServerProcess = null;

    // Clean up on exit
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
    process.on('exit', () => this.cleanup());
  }

  cleanup() {
    if(this.mcpServerProcess && !this.mcpServerProcess.killed) {
      console.log(c`\n{warning}Cleaning up background server...{/}`);
      this.mcpServerProcess.kill();
    }
  }

  async main() {
    console.log(c`{title}MUD Bridge MCP Server - Quick Start{/}`);
    console.log(c`{title}======================================{/}\n`);

    try {
      await this.checkEnvironment();
      await this.showConfiguration();
      await this.testConnection();
      await this.showMenu();
    } catch (error) {
      console.error(c`{error}Error: ${error.message}{/}`);
      process.exit(1);
    } finally {
      // Clean up background server if running
      if(this.mcpServerProcess) {
        this.mcpServerProcess.kill();
      }
      this.rl.close();
    }
  }

  async checkEnvironment() {
    // Check if we're in the right directory
    if(!fs.existsSync('mcp-server.js'))
      throw new Error('mcp-server.js not found. Are you in the mud-bridge directory?');

    // Check Node.js version
    const nodeVersion = process.version;
    console.log(c`{success}Found Node.js version: {highlight}${nodeVersion}{/}`);

    // Check if dependencies are installed
    if(!fs.existsSync('node_modules')) {
      console.log(c`{warning}Installing dependencies...{/}`);
      await this.runCommand('npm', ['install']);
    }

    console.log(c`{success}Dependencies installed{/}`);
  }

  showConfiguration() {
    console.log(c`{cyan}Configuration:{/}`);
    console.log(c`   MUD_HOST: {highlight}${this.mudHost}{/}`);
    console.log(c`   MUD_PORT: {highlight}${this.mudPort}{/}`);
  }

  async testConnection() {
    console.log(c`{cyan}Testing connection to MUD bridge...{/}`);

    const isReachable = await this.testTcpConnection(this.mudHost, this.mudPort);

    if(isReachable) {
      console.log(c`{success}MUD bridge is reachable at {highlight}${this.mudHost}:${this.mudPort}{/}`);
      this.bridgeAvailable = true;
    } else {
      console.log(c`{warning} Cannot connect to MUD bridge at {highlight}${this.mudHost}:${this.mudPort}{/}`);
      console.log(c`   Make sure:`);
      console.log(c`   1. Your MUD is running`);
      console.log(c`   2. The bridge daemon is loaded: {cyan}load_object("/adm/daemons/mcp_bridge"){/}`);
      console.log(c`   3. Port {highlight}${this.mudPort}{/} is accessible`);
      this.bridgeAvailable = false;
    }
  }

  async testTcpConnection(host, port, timeout = 5000) {
    const { default: net } = await import('net');
    return new Promise((resolve) => {
      const socket = new net.Socket();

      const timer = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, timeout);

      socket.on('connect', () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timer);
        resolve(false);
      });

      socket.connect(port, host);
    });
  }

  async showMenu() {
    while (true) {
      console.log(c`\n{magenta}What would you like to do?{/}\n`);
      console.log(`1) Run MCP protocol test (tests MCP communication)`);
      console.log(`2) Run interactive MUD client (if bridge is available)`);
      console.log(c`3) Start MCP server with {info}live output{/} (interactive mode)`);
      console.log(c`4) ${this.mcpServerProcess ? '{warning}Stop background MCP server{/}' : 'Start MCP server in background ({muted}silent mode{/})'}`);
      console.log(`5) Show Claude Desktop configuration`);
      console.log(`6) Show available MCP tools/actions`);
      console.log(`7) Test specific MCP tool`);
      console.log(`8) ${this.mcpServerProcess ? c`{success}Server status (PID: ${this.mcpServerProcess.pid}){/}` : c`{muted}Server status (not running){/}`}`);
      console.log(`9) Exit\n`);

      const choice = await this.prompt('Choose an option (1-9): ');

      try {
        switch (choice.trim()) {
          case '1':
            await this.runMcpTest();
            break;
          case '2':
            await this.runInteractiveClient();
            break;
          case '3':
            await this.startMcpServer();
            break;
          case '4':
            if(this.mcpServerProcess) {
              await this.stopBackgroundServer();
            } else {
              await this.startBackgroundServer();
            }
            break;
          case '5':
            this.showClaudeConfig();
            break;
          case '6':
            this.showAvailableTools();
            break;
          case '7':
            await this.testMcpTool();
            break;
          case '8':
            this.showServerStatus();
            break;
          case '9':
            if(this.mcpServerProcess) {
              console.log(c`{warning}Stopping background server before exit...{/}`);
              await this.stopBackgroundServer();
            }
            console.log(c`{success}Goodbye!{/}`);
            return;
          default:
            console.log(c`{error}Invalid option{/}`);
        }
      } catch (error) {
        console.error(c`{error}Error: ${error.message}{/}`);
      }

      // Pause before showing menu again
      await this.prompt('\nPress Enter to continue...');
    }
  }

  async runMcpTest() {
    console.log(c`{cyan}Running MCP protocol test...{/}`);

    if(fs.existsSync('test-mcp.js')) {
      await this.runCommand('node', ['test-mcp.js']);
    } else {
      console.log(c`{warning}test-mcp.js not found.{/}`);
    }
  }

  async runInteractiveClient() {
    if(!this.bridgeAvailable) {
      console.log(c`{error}Cannot start interactive client - MUD bridge daemon not available{/}`);
      console.log(c`{warning}   This requires the MUD bridge daemon running inside the MUD on port ${this.mudPort}{/}`);
      console.log(c`{info}   Load it with: {highlight}load_object("/adm/daemons/mcp_bridge"){/}`);
      console.log(c`{muted}   (This is different from the MCP server - options 3/4){/}`);
      return;
    }

    console.log(c`{cyan}Starting interactive MUD client...{/}`);

    if(fs.existsSync('mcp-mud-client.js')) {
      await this.runCommand('node', ['mcp-mud-client.js', this.mudHost, this.mudPort]);
    } else {
      console.log(c`{warning}mcp-mud-client.js not found{/}`);
    }
  }

  async startMcpServer() {
    console.log(c`{cyan}Starting MCP server in interactive mode...{/}`);
    console.log(c`   {info}Live output streaming - you'll see all bridge activity{/}`);
    console.log(c`   Connect with Claude Desktop or other MCP clients`);
    console.log(c`   Press {highlight}Ctrl+C{/} to stop\n`);

    const env = {
      ...process.env,
      MUD_HOST: this.mudHost,
      MUD_PORT: this.mudPort,
      DEBUG: 'mcp:*',          // Enable debug output
      VERBOSE: '1'             // Custom verbose flag
    };

    // Start the process with live output streaming
    const serverProcess = spawn('node', ['mcp-server.js'], {
      env,
      stdio: 'inherit' // This pipes stdout/stderr directly to our console
    });

    // Handle process events
    serverProcess.on('error', (error) => {
      console.error(c`\n{error}Failed to start MCP server: ${error.message}{/}`);
    });

    serverProcess.on('exit', (code, signal) => {
      if(code !== null && code !== 0) {
        console.log(c`\n{warning}MCP server stopped with exit code: ${code}{/}`);
      } else if(signal) {
        console.log(c`\n{warning}MCP server stopped by signal: ${signal}{/}`);
      } else {
        console.log(c`\n{success}MCP server stopped gracefully{/}`);
      }
    });

    // Wait for the process to complete
    return new Promise((resolve) => {
      serverProcess.on('close', resolve);
    });
  }

  async startBackgroundServer() {
    if(this.mcpServerProcess) {
      console.log(c`{warning}MCP server already running (PID: ${this.mcpServerProcess.pid}){/}`);
      return;
    }

    console.log(c`{cyan}Starting MCP server in background (silent mode)...{/}`);
    console.log(c`{muted}   Server will run quietly - no output shown{/}`);
    console.log(c`{muted}   Use option 8 to check status, option 4 to stop{/}`);

    const env = {
      ...process.env,
      MUD_HOST: this.mudHost,
      MUD_PORT: this.mudPort
    };

    this.mcpServerProcess = spawn('node', ['mcp-server.js'], {
      env,
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Handle server output (optional - can be removed for truly quiet operation)
    this.mcpServerProcess.stdout.on('data', () => {
      // Uncomment to see server output:
      console.log(c`{muted}[SERVER] ${data.toString().trim()}{/}`);
    });

    this.mcpServerProcess.stderr.on('data', data => {
      console.log(c`{error}[SERVER ERROR] ${data.toString().trim()}{/}`);
    });

    this.mcpServerProcess.on('exit', (code, signal) => {
      if(code !== null) {
        console.log(c`\n{warning}MCP server stopped (exit code: ${code}){/}`);
      } else if(signal) {
        console.log(c`\n{warning}MCP server stopped (signal: ${signal}){/}`);
      }
      this.mcpServerProcess = null;
    });

    this.mcpServerProcess.on('error', error => {
      console.error(c`{error}Failed to start MCP server: ${error.message}{/}`);
      this.mcpServerProcess = null;
    });

    // Give it a moment to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    if(this.mcpServerProcess && !this.mcpServerProcess.killed) {
      console.log(c`{success}MCP server started in background (PID: ${this.mcpServerProcess.pid}){/}`);
      console.log(c`{info}   Ready for Claude Desktop connections{/}`);
      console.log(c`{muted}   Use option 4 to stop or option 8 to check status{/}`);
    } else {
      console.log(c`{error}Failed to start MCP server{/}`);
    }
  }

  async stopBackgroundServer() {
    if(!this.mcpServerProcess) {
      console.log(c`{warning}No MCP server running{/}`);
      return;
    }

    console.log(c`{warning}Stopping MCP server (PID: ${this.mcpServerProcess.pid})...{/}`);

    // Graceful shutdown
    this.mcpServerProcess.kill('SIGTERM');

    // Wait a moment for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Force kill if still running
    if(this.mcpServerProcess && !this.mcpServerProcess.killed) {
      console.log(c`{warning}   Forcing shutdown...{/}`);
      this.mcpServerProcess.kill('SIGKILL');
    }

    this.mcpServerProcess = null;
    console.log(c`{success}MCP server stopped{/}`);
  }

  showServerStatus() {
    if(this.mcpServerProcess) {
      console.log(c`{success}MCP Server Status: Running{/}`);
      console.log(c`   PID: {highlight}${this.mcpServerProcess.pid}{/}`);
      console.log(c`   Host: {highlight}${this.mudHost}{/}`);
      console.log(c`   Port: {highlight}${this.mudPort}{/}`);
      console.log(c`   Status: {success}Active{/}`);

      // Check if process is actually alive
      try {
        process.kill(this.mcpServerProcess.pid, 0);
        console.log(c`   Health: {success}Responsive{/}`);
      } catch (e) {
        console.log(c`   Health: {error}Not responding{/}`);
        this.mcpServerProcess = null;
      }
    } else {
      console.log(c`{muted}MCP Server Status: Not running{/}`);
      console.log(c`   Use option 4 to start in background`);
    }
  }  showClaudeConfig() {
    console.log(c`{cyan}Claude Desktop Configuration:{/}\n`);

    const isWindows = process.platform === 'win32';
    const isMac = process.platform === 'darwin';

    let configPath;
    if(isMac) {
      configPath = '~/Library/Application Support/Claude/claude_desktop_config.json';
    } else if(isWindows) {
      configPath = '%APPDATA%\\Claude\\claude_desktop_config.json';
    } else {
      configPath = '~/.config/claude/claude_desktop_config.json (Linux)';
    }

    console.log(c`File: {highlight}${configPath}{/}\n`);

    const config = {
      mcpServers: {
        "mud-bridge": {
          command: "node",
          args: [path.resolve('./mcp-server.js')],
          env: {
            MUD_HOST: this.mudHost,
            MUD_PORT: this.mudPort
          }
        }
      }
    };

    console.log(JSON.stringify(config, null, 2));
    console.log(c`\n{warning}Then restart Claude Desktop and try: {highlight}'Can you connect to the MUD?'{/}`);
  }

  showAvailableTools() {
  console.log(c`{cyan}Available MCP Tools/Actions:{/}\n`);

  const tools = [
      {
        icon: '',
        name: 'connect',
        description: 'Establishes connection to MUD and creates virtual user',
        details: 'Returns location and room description'
      },
      {
        icon: '',
        name: 'execute',
        description: 'Executes safe MUD commands through virtual user',
        details: 'Allowed commands: look, inventory, score, who, movement, basic interactions\nSecurity: Restricted command set prevents harmful operations'
      },
      {
        icon: '',
        name: 'observe',
        description: 'Gets detailed information about current room',
        details: 'Returns: location, short/long descriptions, exits, objects present\nUseful for understanding MUD environment'
      },
      {
        icon: '',
        name: 'scan_instructions',
        description: 'NEW: Scans directories for instruction/documentation files',
        details: 'Finds: README*, help*, instruction*, doc*, guide*, *.md, *.txt files\nReturns file list and content preview (first 50 lines)\nSecurity: Restricted areas protected (/adm/, /std/, /obj/, etc.)\nExample usage: Scan /ASST/ directory for AI assistant documentation'
      },
      {
        icon: '',
        name: 'disconnect',
        description: 'Cleanly disconnects from MUD and removes virtual user',
        details: ''
      }
    ];

    tools.forEach(tool => {
      console.log(c`${tool.icon} {<B}{highlight}${tool.name}{/}`);
      console.log(c`   - ${tool.description}`);
      if(tool.details) {
        tool.details.split('\n').forEach(line => {
          console.log(c`   - {muted}${line}{/}`);
        });
      }
      console.log('');
    });

    console.log(c`{warning}Example MCP tool usage in Claude Desktop:{/}`);
    console.log(c`   {highlight}'Can you scan the /ASST/ directory for instructions?'{/}`);
    console.log(c`   {highlight}'Connect to the MUD and look around'{/}`);
    console.log(c`   {highlight}'Execute the who command to see online players'{/}\n`);

    console.log(c`{warning}Key directories to scan:{/}`);
    console.log(c`   {cyan}/ASST/{/} - AI assistant documentation and guides`);
    console.log(c`   {cyan}/doc/{/} - General MUD documentation`);
    console.log(c`   {cyan}/help/{/} - Help files`);
  }

  async testMcpTool() {
    if(!this.bridgeAvailable) {
      console.log(c`{error}Cannot test MCP tools - bridge not available{/}`);
      return;
    }

    console.log(c`{cyan}Testing MCP Tools{/}\n`);
    console.log(`Which tool would you like to test?`);
    console.log(c`1) {highlight}connect{/}`);
    console.log(c`2) {highlight}scan_instructions{/} (/ASST/)`);
    console.log(c`3) {highlight}observe{/}`);
    console.log(c`4) {highlight}execute{/} (who command)`);
    console.log(c`5) {highlight}disconnect{/}\n`);

    const choice = await this.prompt('Choose a tool (1-5): ');

    // This would implement actual MCP protocol testing
    // For now, just show what would be sent
    const testMessages = {
      '1': { action: 'connect' },
      '2': { action: 'scan_instructions', directory: '/ASST/' },
      '3': { action: 'observe' },
      '4': { action: 'execute', command: 'who' },
      '5': { action: 'disconnect' }
    };

    const message = testMessages[choice.trim()];
    if(message) {
      console.log(c`{cyan}Would send MCP message:{/}`);
      console.log(JSON.stringify(message, null, 2));
      console.log(c`\n{warning}(Actual MCP testing requires implementing the protocol client){/}`);
    } else {
      console.log(c`{error}Invalid choice{/}`);
    }
  }

  async runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'inherit',
        ...options
      });

      child.on('close', (code) => {
        if(code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }
}

// Run the quick start if called directly
if(import.meta.url === `file://${process.argv[1]}`) {
  const quickStart = new QuickStart();
  quickStart.main().catch(console.error);
}

export default QuickStart;
