#!/usr/bin/env node

/**
 * Simple MCP Test Client for MUD Bridge
 *
 * This script tests the MCP server by connecting to it and running some basic commands.
 * Use this to verify your MCP bridge is working before configuring AI assistants.
 */

import { spawn } from 'child_process';

class MCPTestClient {
    constructor() {
        this.server = null;
        this.messageId = 1;
    }

    async start() {
    console.log('Starting MCP server...');
            console.log('\nRunning MCP Bridge Tests...\n');
        // Start the MCP server
        this.server = spawn('node', ['mcp-server.js'], {
            stdio: ['pipe', 'pipe', 'inherit']
        });

        this.server.on('error', (err) => {
            console.error('Failed to start MCP server:', err);
            process.exit(1);
        });

        // Wait a moment for server to start
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            await this.runTests();
        } catch (error) {
            console.error('Test failed:', error);
        } finally {
            this.server.kill();
        }
    }

    async sendMessage(message) {
      const msg = JSON.stringify(message) + '\n';
      console.log('Sending:', message);

        this.server.stdin.write(msg);

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Message timeout'));
            }, 5000);

            const onData = (data) => {
                clearTimeout(timeout);
                this.server.stdout.removeListener('data', onData);

                try {
                    const response = JSON.parse(data.toString().trim());
                    console.log('Received:', response);
                    resolve(response);
                } catch (err) {
                    reject(err);
                }
            };

            this.server.stdout.on('data', onData);
        });
    }

    async runTests() {
        console.log('\nRunning MCP Bridge Tests...\n');
        // Test 1: Initialize
        console.log('Test 1: Initialize connection');
        const initResponse = await this.sendMessage({
            jsonrpc: "2.0",
            id: this.messageId++,
            method: "initialize",
            params: {
                protocolVersion: "2024-11-05",
                capabilities: {
                    tools: {}
                },
                clientInfo: {
                    name: "test-client",
                    version: "1.0.0"
                }
            }
        });

        if (initResponse.result) {
            console.log('Initialize successful');
        } else {
            throw new Error('Initialize failed');
        }
        console.log('\nTest 2: List available tools');
        const toolsResponse = await this.sendMessage({
            jsonrpc: "2.0",
            id: this.messageId++,
            method: "tools/list"
        });

        if (toolsResponse.result && toolsResponse.result.tools) {
            console.log('Tools listed:', toolsResponse.result.tools.map(t => t.name).join(', '));
        } else {
            throw new Error('Tools list failed');
        }

        // Test 3: Connect to MUD
        console.log('\nTest 3: Connect to MUD');
        const connectResponse = await this.sendMessage({
            jsonrpc: "2.0",
            id: this.messageId++,
            method: "tools/call",
            params: {
                name: "mud_connect",
                arguments: {}
            }
        });

        if (connectResponse.result) {
            console.log('MUD connection successful');
            console.log('Response:', connectResponse.result.content[0].text);
        } else {
            console.log('MUD connection failed (this is expected if MUD is not running)');
            console.log('Error:', connectResponse.error);
        }

        // Test 4: Try a basic command (will fail if not connected, but tests the flow)
        console.log('\nTest 4: Test basic command');
        const cmdResponse = await this.sendMessage({
            jsonrpc: "2.0",
            id: this.messageId++,
            method: "tools/call",
            params: {
                name: "mud_observe_room",
                arguments: {}
            }
        });

        if (cmdResponse.result) {
            console.log('Command execution successful');
            console.log('Response:', cmdResponse.result.content[0].text);
        } else {
            console.log('Command failed (expected if not connected to MUD)');
        }

        console.log('\nTest completed! If you see connection errors, make sure:');
        console.log('   1. The MUD is running');
        console.log('   2. The MCP bridge daemon is loaded: load_object("/adm/daemons/mcp_bridge")');
        console.log('   3. Port 8383 is accessible');
    }
}

// Run the test
const client = new MCPTestClient();
client.start().catch(console.error);
