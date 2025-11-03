#!/usr/bin/env node
/**
 * MCP Server for LLM-to-MUD Bridge
 *
 * This server acts as an MCP (Model Context Protocol) server that allows
 * AI assistants to connect to the MUD through a standardized interface.
 */

import net from 'net';
import readline from 'readline';

class MCPMudBridge {
  constructor(mudHost = 'localhost', mudPort = 8383) {
    this.mudHost = mudHost;
    this.mudPort = mudPort;
    this.connection = null;
    this.sessionId = null;
    this.connected = false;
  }

  async connectToMUD() {
    return new Promise((resolve, reject) => {
      this.connection = net.createConnection({
        host: this.mudHost,
        port: this.mudPort
      });

      this.connection.on('connect', () => {
  console.log('Connected to MUD MCP bridge');
        resolve();
      });

      this.connection.on('data', (data) => {
  this.handleMudResponse(data.toString());
      });

      this.connection.on('error', (err) => {
  console.error('Connection error:', err);
        reject(err);
      });

      this.connection.on('close', () => {
  console.log('Connection to MUD closed');
        this.connected = false;
      });
    });
  }

  handleMudResponse(data) {
  const lines = data.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const message = JSON.parse(line);
        this.processMudMessage(message);
      } catch (e) {
        console.log('Non-JSON data:', line);
      }
    }
  }

  processMudMessage(message) {
  switch (message.type) {
      case 'handshake':
  console.log('Received handshake, sending hello...');
        this.sendHello();
        break;

      case 'hello_response':
  this.sessionId = message.session_id;
  console.log('Authenticated with session:', this.sessionId);
  this.connectToMudWorld();
        break;

      case 'connect_response':
        if (message.status === 'connected') {
          this.connected = true;
          console.log('Connected to MUD world at:', message.location);
          console.log('Your character name:', message.name);
          this.startInteractiveMode();
        }
        break;

      case 'command_response':
  console.log(`Command '${message.command}' executed:`, message.status);
        break;

      case 'output':
  console.log('MUD Output:', message.content);
        break;

      case 'observe_response':
        console.log('Room Information:');
        console.log('Location:', message.location);
        if (message.room_data) {
          console.log('Short:', message.room_data.short);
          console.log('Description:', message.room_data.long);
          if (message.room_data.exits) {
            console.log('Exits:', Object.keys(message.room_data.exits));
          }
        }
        break;

      case 'error':
        console.error('MUD Error:', message.error);
        break;

      default:
        console.log('Unknown message type:', message);
    }
  }

  sendMessage(message) {
    if (this.connection && !this.connection.destroyed) {
      this.connection.write(JSON.stringify(message) + '\n');
    }
  }

  sendHello() {
    this.sendMessage({
      type: 'hello',
      session_id: 'mcp_llm_' + Date.now(),
      client_name: 'LLM MCP Client',
      version: '1.0'
    });
  }

  connectToMudWorld() {
    this.sendMessage({
      type: 'connect_to_mud'
    });
  }

  executeCommand(command) {
    if (!this.connected) {
      console.log('Not connected to MUD world');
      return;
    }

    this.sendMessage({
      type: 'execute_command',
      command: command
    });
  }

  observeRoom() {
    if (!this.connected) {
      console.log('Not connected to MUD world');
      return;
    }

    this.sendMessage({
      type: 'observe_room'
    });
  }

  startInteractiveMode() {
    console.log('\n=== Interactive MCP-MUD Bridge ===');
    console.log('Commands:');
    console.log('  /observe - Get current room information');
    console.log('  /disconnect - Disconnect from MUD');
    console.log('  /quit - Quit this client');
    console.log('  Any other input will be sent as a MUD command');
    console.log('=====================================\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'MUD> '
    });

    rl.prompt();

    rl.on('line', (input) => {
      const command = input.trim();

      if (command === '/observe') {
        this.observeRoom();
      } else if (command === '/disconnect') {
        this.disconnect();
      } else if (command === '/quit') {
        this.disconnect();
        process.exit(0);
      } else if (command) {
        this.executeCommand(command);
      }

      rl.prompt();
    });

    rl.on('close', () => {
      this.disconnect();
      process.exit(0);
    });
  }

  disconnect() {
    if (this.connection && !this.connection.destroyed) {
      this.sendMessage({ type: 'disconnect' });
      this.connection.end();
    }
  }
}

// MCP Server Implementation
class MCPServer {
  constructor(port = 3000) {
    this.port = port;
    this.mudBridge = new MCPMudBridge();
  }

  async start() {
    console.log('Starting MCP Server on port', this.port);

    // Connect to MUD first
    await this.mudBridge.connectToMUD();

    // Start MCP server (simplified for demo)
    console.log('MCP Server ready for LLM connections');
    console.log('In a real implementation, this would accept MCP protocol connections');

    // For demo, just start interactive mode
    return this.mudBridge;
  }

  // MCP protocol handlers would go here
  handleMCPRequest(request) {
    // Convert MCP requests to MUD commands
    switch (request.method) {
      case 'mud/connect':
        return this.mudBridge.connectToMudWorld();
      case 'mud/command':
        return this.mudBridge.executeCommand(request.params.command);
      case 'mud/observe':
        return this.mudBridge.observeRoom();
      default:
        throw new Error(`Unknown MCP method: ${request.method}`);
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const mudHost = args[0] || 'localhost';
  const mudPort = parseInt(args[1]) || 8383;

  console.log(`Connecting to MUD at ${mudHost}:${mudPort}`);

  const server = new MCPServer();
  server.start().then(() => {
    console.log('MCP-MUD Bridge established successfully!');
  }).catch((err) => {
    console.error('Failed to establish bridge:', err);
    process.exit(1);
  });
}

export { MCPServer, MCPMudBridge };
