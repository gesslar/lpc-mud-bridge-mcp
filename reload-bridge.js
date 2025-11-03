import net from 'net';

console.log('Testing if we can force daemon reload...');

// First, let's send a test message to see the debug output
const socket = new net.Socket();

socket.on('data', (data) => {
  console.log('Response:', data.toString());
});

socket.on('connect', () => {
  console.log('Connected, sending test message...');
  // Send a malformed message to trigger debug output
  socket.write('{"type":"test_message"}\n');

  setTimeout(() => {
    socket.end();
  }, 2000);
});

socket.on('error', (error) => {
  console.error('Error:', error);
});

socket.on('close', () => {
  console.log('Connection closed');
  process.exit(0);
});

socket.connect(8383, 'localhost');

setTimeout(() => {
  console.log('Timeout');
  process.exit(1);
}, 5000);
