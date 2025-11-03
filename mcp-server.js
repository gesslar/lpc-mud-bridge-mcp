#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import net from 'net';
import c from '@gesslar/colours';

class MudConnection {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.sessionId = null;
    this.messageHandlers = new Map();
    this.messageBuffer = '';
  }

  onMessage(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  sendMessage(message) {
    if (this.socket && !this.socket.destroyed) {
      this.socket.write(JSON.stringify(message) + '\n');
    }
  }

  async connect(host = 'localhost', port = 8383) {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();

      this.socket.on('data', (data) => {
        this.messageBuffer += data.toString();
        let lines = this.messageBuffer.split('\n');
        this.messageBuffer = lines.pop() || '';

        for (let line of lines) {
          if (line.trim()) {
            try {
              const message = JSON.parse(line);
              // MUD daemon sends simple responses - treat all as 'response' type
              const handler = this.messageHandlers.get('response');
              if (handler) {
                handler(message);
              }
              // Also call any specific handlers if they exist
              if (message.success !== undefined) {
                const successHandler = this.messageHandlers.get('success');
                if (successHandler) successHandler(message);
              }
            } catch (error) {
              console.error('Failed to parse message:', error, 'Raw line:', line);
            }
          }
        }
      });

      this.socket.on('connect', async () => {
        try {
          await this.authenticateAndConnect();
          resolve({ success: true, message: 'Connected to MUD successfully' });
        } catch (error) {
          reject({ success: false, error: error.message });
        }
      });

      this.socket.on('error', (error) => {
        reject({ success: false, error: error.message });
      });

      this.socket.on('close', () => {
        this.connected = false;
        this.sessionId = null;
      });

      this.socket.connect(port, host);
    });
  }

  async waitForMessage(type, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.messageHandlers.delete(type);
        reject(new Error(`Timeout waiting for ${type} message`));
      }, timeout);

      const originalHandler = this.messageHandlers.get(type) || (() => {});
      this.onMessage(type, (message) => {
        clearTimeout(timer);
        this.messageHandlers.set(type, originalHandler);
        resolve(message);
      });
    });
  }

  async authenticateAndConnect() {
    // Simple protocol - just send connect action
    this.sendMessage({
      action: 'connect'
    });

    // Wait for success response
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);

      const originalHandler = this.messageHandlers.get('response') || (() => {});
      this.messageHandlers.set('response', (message) => {
        clearTimeout(timer);
        if (message.success) {
          this.connected = true;
          this.sessionId = 'mcp_' + Date.now(); // Generate our own session ID
          resolve(message);
        } else {
          reject(new Error(message.error || 'Connection failed'));
        }
        this.messageHandlers.set('response', originalHandler);
      });
    });
  }

  async sendCommand(command) {
    if (!this.connected) {
      throw new Error('Not connected to MUD');
    }

    this.sendMessage({
      action: 'execute',
      command: command
    });

    return await this.waitForMessage('response');
  }

  disconnect() {
    if (this.socket && !this.socket.destroyed) {
      this.sendMessage({ action: 'disconnect' });
      this.socket.end();
    }
  }
}

class MCPMudServer {
  constructor() {
    this.mudConnection = null;
    this.verbose = process.env.VERBOSE === '1';
    this.server = new McpServer({
      name: 'mud-bridge',
      version: '1.0.0',
    });
    this.setupTools();
  }

  log(message, ...args) {
    if (this.verbose) {
      const timestamp = new Date().toISOString().substr(11, 12);
      console.error(c`{F058}[{F070}${timestamp}{F058}]{/} ${message}`, ...args);
    }
  }

  setupTools() {
    this.server.registerTool('mud_connect', {
      title: 'Connect to MUD',
      description: 'Connect to the MUD world as a virtual user',
      inputSchema: {},
    }, async () => {
      this.log('MCP Tool Called: mud_connect');
      try {
        if (this.mudConnection && this.mudConnection.connected) {
              this.log('Already connected to MUD');
          return {
            content: [{ type: 'text', text: JSON.stringify({
              status: 'already_connected',
              sessionId: this.mudConnection.sessionId,
              message: 'Already connected to MUD'
            })}]
          };
        }

        this.mudConnection = new MudConnection();
        const result = await this.mudConnection.connect();

        if (result.success) {
          return {
            content: [{ type: 'text', text: JSON.stringify({
              status: 'connected',
              sessionId: this.mudConnection.sessionId,
              message: result.message
            })}]
          };
        } else {
          return {
            content: [{ type: 'text', text: JSON.stringify({
              status: 'failed',
              message: result.error
            })}]
          };
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({
            status: 'error',
            message: error.message
          })}]
        };
      }
    });

    this.server.registerTool('mud_execute_command', {
      title: 'Execute MUD Command',
      description: 'Execute a command in the MUD',
      inputSchema: {
        command: z.string().describe('The MUD command to execute')
      },
    }, async ({ command }) => {
      this.log('MCP Tool Called: mud_execute_command -', command);
      try {
        if (!this.mudConnection || !this.mudConnection.connected) {
              this.log('Execute failed: Not connected to MUD');
          return {
            content: [{ type: 'text', text: JSON.stringify({
              result: 'Not connected to MUD. Use mud_connect first.',
              success: false
            })}]
          };
        }

        const result = await this.mudConnection.sendCommand(command);
        return {
          content: [{ type: 'text', text: JSON.stringify({
            result: result.response || result.output || 'Command executed',
            success: result.success !== false
          })}]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({
            result: error.message,
            success: false
          })}]
        };
      }
    });

    this.server.registerTool('mud_observe_room', {
      title: 'Observe Current Room',
      description: 'Get detailed information about the current room',
      inputSchema: {},
    }, async () => {
      try {
        if (!this.mudConnection || !this.mudConnection.connected) {
          return {
            content: [{ type: 'text', text: JSON.stringify({
              description: 'Not connected to MUD. Use mud_connect first.'
            })}]
          };
        }

        const result = await this.mudConnection.sendCommand('look');
        return {
          content: [{ type: 'text', text: JSON.stringify({
            description: result.response || result.output || 'No description available'
          })}]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({
            description: error.message
          })}]
        };
      }
    });

    this.server.registerTool('mud_move', {
      title: 'Move Direction',
      description: 'Move in a direction',
      inputSchema: {
        direction: z.string().describe('Direction to move (north, south, east, west, up, down, etc.)')
      },
    }, async ({ direction }) => {
      try {
        if (!this.mudConnection || !this.mudConnection.connected) {
          return {
            content: [{ type: 'text', text: JSON.stringify({
              result: 'Not connected to MUD. Use mud_connect first.',
              success: false
            })}]
          };
        }

        const result = await this.mudConnection.sendCommand(direction);
        return {
          content: [{ type: 'text', text: JSON.stringify({
            result: result.response || result.output || 'No response',
            success: result.success !== false
          })}]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({
            result: error.message,
            success: false
          })}]
        };
      }
    });

    this.server.registerTool('mud_say', {
      title: 'Say Message',
      description: 'Speak in the current room',
      inputSchema: {
        message: z.string().describe('Message to say')
      },
    }, async ({ message }) => {
      try {
        if (!this.mudConnection || !this.mudConnection.connected) {
          return {
            content: [{ type: 'text', text: JSON.stringify({
              result: 'Not connected to MUD. Use mud_connect first.',
              success: false
            })}]
          };
        }

        const result = await this.mudConnection.sendCommand(`say ${message}`);
        return {
          content: [{ type: 'text', text: JSON.stringify({
            result: result.response || result.output || 'Message sent',
            success: result.success !== false
          })}]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({
            result: error.message,
            success: false
          })}]
        };
      }
    });

    this.server.registerTool('mud_who', {
      title: 'Who Is Online',
      description: 'See who is currently online',
      inputSchema: {},
    }, async () => {
      try {
        if (!this.mudConnection || !this.mudConnection.connected) {
          return {
            content: [{ type: 'text', text: JSON.stringify({
              players: [],
              count: 0,
              raw_output: 'Not connected to MUD. Use mud_connect first.'
            })}]
          };
        }

        const result = await this.mudConnection.sendCommand('who');
        const rawOutput = result.response || result.output || 'No response';
        return {
          content: [{ type: 'text', text: JSON.stringify({
            players: [rawOutput],
            count: 1,
            raw_output: rawOutput
          })}]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({
            players: [],
            count: 0,
            raw_output: error.message
          })}]
        };
      }
    });

    this.server.registerTool('mud_disconnect', {
      title: 'Disconnect from MUD',
      description: 'Disconnect from the MUD',
      inputSchema: {},
    }, async () => {
      try {
        if (!this.mudConnection || !this.mudConnection.connected) {
          return {
            content: [{ type: 'text', text: JSON.stringify({
              status: 'not_connected',
              message: 'Not connected to MUD'
            })}]
          };
        }

        this.mudConnection.disconnect();
        this.mudConnection = null;

        return {
          content: [{ type: 'text', text: JSON.stringify({
            status: 'disconnected',
            message: 'Disconnected from MUD'
          })}]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({
            status: 'error',
            message: error.message
          })}]
        };
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();

    // Add connection event logging
    if (this.verbose) {
      this.log('MCP Server starting...');
      this.log('Waiting for client connections (Claude Desktop, etc.)');
    }

    await this.server.connect(transport);
    console.error('MUD Bridge MCP server started');

    if (this.verbose) {
      this.log('MCP Server ready');
      this.log('Available tools: mud_connect, mud_execute_command, mud_observe_room, mud_move, mud_say, mud_who, mud_disconnect');
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new MCPMudServer();
  server.start().catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}

export { MCPMudServer, MudConnection };
