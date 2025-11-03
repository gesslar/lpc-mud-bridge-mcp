# MUD Bridge MCP Server

This MCP server allows AI assistants to connect to and interact with the Threshold MUD through a secure bridge connection.

## Overview

The system consists of three main components:

1. **MUD Bridge Daemon** (`/adm/daemons/mcp_bridge.c`) - Runs inside the MUD, listens on port 8383
2. **Virtual User Object** (`/adm/obj/mcp_virtual_user.c`) - Represents AI assistants in the MUD world
3. **MCP Server** (`mcp-server.js`) - Node.js server that implements the MCP protocol

## Architecture

```
AI Assistant <--MCP--> Node.js Server <--JSON/TCP--> MUD Bridge Daemon <--> Virtual User Object
```

## Features

### Security & Safety

- **Command Filtering**: Only safe commands are allowed (movement, communication, observation)
- **Rate Limiting**: Prevents command spam (max 30 commands/minute)
- **Area Restrictions**: Cannot access admin areas (/adm/, /std/, /obj/)
- **No Persistent Changes**: Virtual users cannot save data or modify the world permanently
- **Sandboxed Environment**: Virtual users have minimal HP, no combat abilities

### Available MCP Tools

- `mud_connect` - Connect to the MUD world
- `mud_execute_command` - Execute safe MUD commands
- `mud_observe_room` - Get detailed room information
- `mud_move` - Move in directions
- `mud_say` - Speak in the current room
- `mud_who` - See who's online
- `mud_disconnect` - Disconnect from the MUD

## Quick Start

For the fastest setup, use the included interactive quick-start tool:

```bash
cd /mud/frogdice/thresh/lib/mcp-servers/mud-bridge

# Option 1: Run the JavaScript version directly
node quick-start.js

# Option 2: Use the convenience script
./quick-start
```

This interactive tool will guide you through:

- Environment checking and dependency installation
- Connection testing to the MUD bridge
- MCP protocol testing
- Claude Desktop configuration
- Available tools documentation
- Interactive testing of individual MCP tools

## Manual Installation

1. **Install the MUD components:**

   ```bash
   # Copy the daemon and virtual user files to your MUD
   # They should already be in /adm/daemons/mcp_bridge.c and /adm/obj/mcp_virtual_user.c
   ```

2. **Start the MUD bridge daemon:**

   ```lpc
   // In your MUD, as an admin:
   load_object("/adm/daemons/mcp_bridge");
   ```

3. **Install Node.js dependencies:**

   ```bash
   cd /path/to/mud-bridge
   npm install
   ```

## Usage

### Starting the MCP Server

```bash
node mcp-server.js
```

The server will connect to the MUD bridge daemon on localhost:8383 by default.

### Testing with the Client

```bash
node mcp-mud-client.js [mud_host] [mud_port]
```

This provides an interactive interface to test the bridge connection.

### Integrating with AI Assistants

Add this server to your MCP client configuration. The AI assistant will then have access to the MUD tools and can:

- Connect to the MUD world as a virtual character
- Explore rooms and areas safely
- Communicate with other players
- Observe and describe the game world
- Execute safe commands for gameplay assistance

## MCP Configuration

### For Claude Desktop

Add this to your Claude Desktop MCP settings file:

**Location**:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mud-bridge": {
      "command": "node",
      "args": ["/path/to/mud-bridge/mcp-server.js"],
      "env": {
        "MUD_HOST": "localhost",
        "MUD_PORT": "8383"
      }
    }
  }
}
```

### For Other MCP Clients

Configure your MCP client to run:

```bash
node /path/to/mud-bridge/mcp-server.js
```

With environment variables:

- `MUD_HOST` - MUD bridge daemon host (default: localhost)
- `MUD_PORT` - MUD bridge daemon port (default: 8383)

### Testing the MCP Connection

Before setting up AI assistants, test that everything is working:

1. **Start the MUD and load the bridge daemon:**

   ```lpc
   // In your MUD as an admin:
   load_object("/adm/daemons/mcp_bridge");
   ```

2. **Run the test client:**

   ```bash
   cd /path/to/mud-bridge
   node test-mcp.js
   ```

   This will test the MCP protocol and connection to the MUD bridge.

3. **For interactive testing, use the included client:**

   ```bash
   node mcp-mud-client.js localhost 8383
   ```

4. **Or connect with Claude Desktop** and try:

   - "Can you connect to the MUD and tell me about your surroundings?"
   - "Help me navigate to the town square"
   - "Who is currently online in the MUD?"
   - "Describe the room I'm in and list the exits"

The test client will show you exactly what's working and what might need troubleshooting.

### Example AI Assistant Interactions

Once configured, AI assistants can help with:

```text
User: "Connect to the MUD and help me find the library"
AI: I'll connect to the MUD and help you navigate to the library.
    *connects and looks around*
    I can see you're currently in the Town Square. From here, I can see exits
    leading north to the Merchant District and east to the Residential Area.
    Libraries are typically found in academic districts. Let me explore...

User: "What can you see in this room?"
AI: Let me observe your current location in detail.
    *uses mud_observe_room*
    You're in the Great Library of Sable. This vast repository of knowledge
    contains thousands of books on shelves reaching up to the vaulted ceiling.
    There are several NPCs here: a helpful librarian and a few scholars
    studying quietly. I can see exits leading west back to the town square.
```

## Environment Variables

The MCP server accepts these environment variables:

- `MUD_HOST` - Hostname/IP of the MUD bridge daemon (default: "localhost")
- `MUD_PORT` - Port of the MUD bridge daemon (default: "8383")
- `DEBUG` - Enable debug logging (set to "1" or "true")

Example:

```bash
MUD_HOST=your-mud-server.com MUD_PORT=8383 DEBUG=1 node mcp-server.js
```

## Configuration

### MUD Bridge Daemon Configuration

Edit `/adm/daemons/mcp_bridge.c` to modify:

- `MCP_PORT` - Port to listen on (default: 8383)
- `MAX_CONNECTIONS` - Maximum concurrent connections (default: 10)
- `allowed_commands` - List of permitted commands
- `restricted_areas` - List of forbidden paths

### Virtual User Configuration

Edit `/adm/obj/mcp_virtual_user.c` to modify:

- `max_commands_per_minute` - Rate limiting (default: 30)
- `restricted_commands` - Commands that are blocked
- `safe_starting_rooms` - Where virtual users spawn

## Security Considerations

### What AI Assistants CAN Do

- Move around public areas of the MUD
- Observe and describe rooms, objects, and players
- Communicate with other players
- Execute basic informational commands
- Help with navigation and exploration

### What AI Assistants CANNOT Do

- Access administrative areas or functions
- Modify game files or data
- Attack other players or NPCs
- Use wizard/admin commands
- Persistent character progression
- Access restricted commands

## Troubleshooting

### Connection Issues

1. **Check MUD bridge daemon:**

   ```lpc
   // In MUD:
   load_object("/adm/daemons/mcp_bridge")->query_connections()
   ```

2. **Check port accessibility:**

   ```bash
   telnet localhost 8383
   ```

3. **Check logs:**

   ```bash
   # MUD logs
   tail -f /path/to/mud/log/mcp_bridge

   # Node.js server logs
   # Server logs to stderr
   ```

### Virtual User Issues

1. **Check virtual user status:**

   ```lpc
   // In MUD:
   load_object("/adm/daemons/mcp_bridge")->query_virtual_users()
   ```

2. **Rate limiting:**
   - Virtual users are limited to 30 commands per minute
   - Wait for the rate limit to reset

3. **Command restrictions:**
   - Only safe commands are allowed
   - Check the `allowed_commands` list in the bridge daemon

## Development

### Adding New MCP Tools

1. Add the tool definition in `mcp-server.js` to the `tools/list` handler
2. Add the handler function in the `tools/call` handler
3. Update this documentation

### Extending Virtual User Capabilities

1. Modify `/adm/obj/mcp_virtual_user.c` to add new safe functions
2. Update the bridge daemon to handle new message types
3. Add corresponding MCP tools in the Node.js server

## License

MIT License - Feel free to modify and extend for your MUD's needs.
