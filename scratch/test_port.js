const net = require('net');

const host = 'knsjvttjkbdztxmtjxpz.supabase.co';
const ports = [80, 443, 5432, 6543];

function testPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    
    socket.on('connect', () => {
      console.log(`Port ${port} on ${host} is OPEN`);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      console.log(`Port ${port} on ${host} timed out`);
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', (err) => {
      console.log(`Port ${port} on ${host} is CLOSED (${err.message})`);
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

async function main() {
  for (const port of ports) {
    await testPort(port);
  }
}

main();
