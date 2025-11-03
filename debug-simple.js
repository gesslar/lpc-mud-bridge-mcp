import net from 'net';

const socket = new net.Socket();
let messageBuffer = '';

socket.on('data', (data) => {
  console.log('ALL DATA:', JSON.stringify(data.toString()));
  messageBuffer += data.toString();

  let lines = messageBuffer.split('\n');
  messageBuffer = lines.pop() || '';

  for (let line of lines) {
    if (line.trim()) {
      console.log('LINE:', JSON.stringify(line));
    }
  }
});

socket.on('connect', () => {
  console.log('Connected, waiting for handshake...');
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
}, 3000);
