import net from 'net';

const socket = new net.Socket();
let step = 0;

socket.on('data', (data) => {
  console.log(`STEP ${step}:`, JSON.stringify(data.toString()));

  if (step === 0) {
    // Got handshake, send hello
  console.log('Sending hello message...');
    const hello = JSON.stringify({
      type: 'hello',
      session_id: 'debug_test_123',
      client_name: 'Debug Client',
      version: '1.0'
    });
  console.log('HELLO:', hello);
    socket.write(hello + '\n');
    step = 1;
  }
});

socket.on('connect', () => {
  console.log('Connected');
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
  console.log('Timeout after 5 seconds');
  process.exit(1);
}, 5000);
