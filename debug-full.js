import net from 'net';

console.log('Testing full MUD bridge handshake...');

const socket = new net.Socket();
let messageBuffer = '';

socket.on('data', (data) => {
  console.log('Raw data received:', JSON.stringify(data.toString()));
  messageBuffer += data.toString();

  let lines = messageBuffer.split('\n');
  messageBuffer = lines.pop() || '';

  console.log('Processing', lines.length - 1, 'complete lines');

  for (let line of lines) {
    if (line.trim()) {
  console.log('Processing line:', JSON.stringify(line));
      try {
        const message = JSON.parse(line);
  console.log('Parsed message:', message);

        if (message.type === 'handshake') {
          console.log('Got handshake, sending hello...');
          const hello = {
            type: 'hello',
            session_id: 'test_' + Date.now(),
            client_name: 'Debug Test',
            version: '1.0'
          };
          console.log('Sending hello:', hello);
          socket.write(JSON.stringify(hello) + '\n');
        } else if (message.type === 'hello_response') {
          console.log('Got hello response, sending connect...');
          const connect = { type: 'connect_to_mud' };
          console.log('Sending connect:', connect);
          socket.write(JSON.stringify(connect) + '\n');
        } else if (message.type === 'connect_response') {
          console.log('Got connect response:', message);
          console.log('Full handshake successful!');
          socket.end();
        } else {
          console.log('Unknown message type:', message.type);
        }
      } catch (error) {
  console.error('Parse error:', error);
  console.error('Raw line:', JSON.stringify(line));
      }
    }
  }
});

socket.on('connect', () => {
  console.log('Connected to bridge at localhost:8383');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
  process.exit(1);
});

socket.on('close', () => {
  console.log('Connection closed');
  process.exit(0);
});

console.log('Connecting to localhost:8383...');
socket.connect(8383, 'localhost');

setTimeout(() => {
  console.log('Timeout after 10 seconds');
  process.exit(1);
}, 10000);
