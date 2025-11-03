#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Create a simple test server
const server = new Server(
  {
    name: 'test-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Try to set up a simple handler
try {
  server.setRequestHandler({
    method: 'tools/list',
    handler: async () => {
      return {
        tools: []
      };
    }
  });
  console.log('Handler setup successful with object syntax');
} catch (error) {
  console.log('Object syntax failed:', error.message);
  try {
    // Try the original syntax
    server.setRequestHandler('tools/list', async () => {
      return {
        tools: []
      };
    });
    console.log('Handler setup successful with string syntax');
  } catch (error2) {
    console.log('String syntax also failed:', error2.message);
  }
}

console.log('Server created successfully');
console.log('Available methods:', Object.getOwnPropertyNames(server).concat(Object.getOwnPropertyNames(Object.getPrototypeOf(server))));
