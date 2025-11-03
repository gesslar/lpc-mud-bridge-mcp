import net from 'net';

console.log('Testing MUD bridge connection...');

const socket = new net.Socket();
let messageBuffer = '';

socket.on('data', (data) => {
  console.log('Raw data received:', data.toString());
  messageBuffer += data.toString();

  let lines = messageBuffer.split('\n');
  messageBuffer = lines.pop() || '';

  for (let line of lines) {
    if (line.trim()) {
      try {
        const message = JSON.parse(line);
  console.log('Parsed message:', message);

        if (message.type === 'handshake') {
          console.log('Got handshake, sending hello...');
          socket.write(JSON.stringify({
            type: 'hello',
            session_id: 'test_' + Date.now(),
            client_name: 'Debug Test',
            version: '1.0'
          }) + '\n');
        } else if (message.type === 'hello_response') {
          console.log('Got hello response, sending connect...');
          socket.write(JSON.stringify({
            type: 'connect_to_mud'
          }) + '\n');
        } else if (message.type === 'connect_response') {
          console.log('Got connect response:', message);
          socket.end();
        }
      } catch (error) {
  console.error('Parse error:', error);
      }
    }
  }
});

socket.on('connect', () => {
  console.log('Connected to bridge');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

socket.on('close', () => {
  console.log('Connection closed');
  process.exit(0);
});

socket.connect(8383, 'localhost');

setTimeout(() => {
  console.log('Timeout - forcing exit');
  process.exit(1);
}, 5000);
