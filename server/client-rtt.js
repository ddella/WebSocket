/**
 * Calculate the RTT between the client and the server.
 */
import WebSocket from 'ws';

const wss = new WebSocket('wss://localhost:6443/rtt', {
    // accept self-signed certificate
    rejectUnauthorized:false,
    // strictSSL: false
    }
);
// const wss = new WebSocket('ws://localhost:6080/rtt');

wss.on('open', function open() {
  console.log('connected');
  wss.send(Date.now());
});

wss.on('close', function close() {
  console.log('disconnected');
});

wss.on('message', function message(data) {
    console.log(`Round-Trip Time: ${Date.now() - data} ms`);
});
