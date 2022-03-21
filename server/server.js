/**
 * Install WebSocket module
 *    npm install --save-dev ws
 * Install nodemon module
 *    npm install --save-dev nodemon
 * 
 * Allows to efficiently perform operations such as masking and unmasking
 * the data payload of the WebSocket frames.
 *    npm install --save-dev bufferutil
 * 
 * Allows to efficiently check if a message contains valid UTF-8.
 *    npm install --save-dev utf-8-validate
 * 
 * Run in dev mode: npm run dev
 * Run in normal mode: npm run start
 * 
 * Run in Docker
 * docker run -it --rm --name wss --hostname wss --domainname example.com --ip 172.31.10.20 -p 9443:6443 -p 9080:6080 -v $PWD/:/run -w /run --network frontend node:17-alpine npm run dev
 * 
 * openssl genrsa -out ssl/websocket_rootCA.key 4096
 * openssl req -x509 -new -nodes -key ssl/websocket_rootCA.key -sha256 -days 3650 -out ssl/websocket_rootCA.crt -config ssl/websocket.cnf -extensions v3_ca -subj "/CN=websocket Root CA"
 * openssl genrsa -out ssl/websocket.key 4096
 * openssl req -new -key ssl/websocket.key -out ssl/websocket.csr -config ssl/websocket.cnf -extensions v3_req
 * openssl x509 -req -in ssl/websocket.csr -CA ssl/websocket_rootCA.crt -CAkey ssl/websocket_rootCA.key -CAcreateserial -out ssl/websocket.crt -days 3650 -sha256 -extfile ssl/websocket.cnf -extensions v3_req
 * # cat ssl/websocket.crt ssl/websocket.key > server/websocket.pem
 * 
 * ssl/websocket.crt => the certificate
 * ssl/websocket.key => the key
 * 
 */

import * as http from 'http'; //ES 6
import * as https from 'https'; //ES 6
import { readFileSync } from 'fs';
import { WebSocketServer } from 'ws';
import { log } from 'console';

let WS_PORT  = 6080;
let WSS_PORT = 6443;

if (process.env.WS_PORT) {
  WS_PORT = process.env.WS_PORT;
}

if (process.env.WSS_PORT) {
  WSS_PORT = process.env.WSS_PORT;
}

const options = {
  cert: readFileSync('ssl/websocket.crt'),
  key: readFileSync('ssl/websocket.key')
};

const server_https = https.createServer(options);
const server_http = http.createServer();

const wss_foo = new WebSocketServer({ noServer: true });
const wss_bar = new WebSocketServer({ noServer: true });
const wss_rtt = new WebSocketServer({ noServer: true });
const wss_    = new WebSocketServer({ noServer: true });

// WebSocket with endpoint "/foo"
wss_foo.on('connection', function connection(ws, request) {
  console.log('The IP is: ' + request.socket.remoteAddress);
  ws.on('message', function message(data) {
    console.log('received: %s', data);
    ws.send(data.toString());
  });
  ws.send('Connected to "/foo"...');
  // const interval = setInterval(function ping() {
  //   ws.ping();
  // }, 3000);
  ws.on('close', () => {
      console.log('Connection closed');
      // clearInterval(interval);
    });
});

// WebSocket with endpoint "/bar"
wss_bar.on('connection', function connection(ws) {
  ws.on('message', function message(data) {
    console.log('received: %s', data);
    ws.send(data.toString());
  });
  ws.send('Connected to "/bar"...');
  ws.on('close', () => {
    console.log('Connection closed');
    // clearInterval(interval);
  });
});

// WebSocket with endpoint "/rtt"
wss_rtt.on('connection', function connection(ws) {
  ws.on('message', function message(data) {
    ws.send(data);
    console.log(`Timestamp from client: ${data.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, " ")} ms`);
    ws.close();
  });
});

// WebSocket without endpoint or with endpoint "/"
wss_.on('connection', function connection(ws) {
  ws.on('message', function message(data) {
    console.log('received: %s', data);
    ws.send(data.toString());
  });
  ws.send('Connected to "/". No endpoint...');
  ws.on('close', () => {
    console.log('Connection closed');
    // clearInterval(interval);
  });
});

server_https.on('upgrade', function upgrade(request, socket, head) {
  // const { pathname } = parse(request.url);
  const myURL = new URL(request.url, `https://${request.headers.host}`);
  const pathname = myURL.pathname;

  // Make sure that we only handle WebSocket upgrade requests
  if (request.headers['upgrade'] !== 'websocket') {
    socket.end('HTTP/1.1 400 Bad Request');
    console.log('HTTP/1.1 400 Bad Request: "upgrade request" is not "websocket"');
    return;
  }

  // Read the subprotocol from the client request headers:
  const protocol = request.headers['sec-websocket-protocol'];
  if (protocol) {
    console.log('sec-websocket-protocol: ' + protocol);
    // If provided, they'll be formatted as a comma-delimited string of protocol
    // names that the client supports; we'll need to parse the header value.
  } else {
    console.log('sec-websocket-protocol is EMPTY');
  }

  // depending on the 'endpoint' value, we send the request to the appropriate WebSocket handler
  if (pathname === '/foo') {
    wss_foo.handleUpgrade(request, socket, head, function done(ws) {
      wss_foo.emit('connection', ws, request);
    });
  } else if (pathname === '/bar') {
    wss_bar.handleUpgrade(request, socket, head, function done(ws) {
      wss_bar.emit('connection', ws, request);
    });
  } else if (pathname === '/rtt') {
    wss_rtt.handleUpgrade(request, socket, head, function done(ws) {
      wss_rtt.emit('connection', ws, request);
    });
  } else if (pathname === '/') {
    wss_.handleUpgrade(request, socket, head, function done(ws) {
      wss_.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
    console.log('Endpoint is invalid. Please specify either "foo", "bar" or no endpoint.');
  }
});

server_http.on('upgrade', function upgrade(request, socket, head) {
  const myURL = new URL(request.url, `http://${request.headers.host}`);
  const pathname = myURL.pathname;

  // Make sure that we only handle WebSocket upgrade requests
  if (request.headers['upgrade'] !== 'websockett') {
    socket.end('HTTP/1.1 400 Bad Request');
    console.log('HTTP/1.1 400 Bad Request: "upgrade request" is not "websocket"');
    return;
  }

  if (pathname === '/foo') {
    wss_foo.handleUpgrade(request, socket, head, function done(ws) {
      wss_foo.emit('connection', ws, request);
    });
  } else if (pathname === '/bar') {
    wss_bar.handleUpgrade(request, socket, head, function done(ws) {
      wss_bar.emit('connection', ws, request);
    });
  } else if (pathname === '/rtt') {
    wss_rtt.handleUpgrade(request, socket, head, function done(ws) {
      wss_rtt.emit('connection', ws, request);
    });
  } else if (pathname === '/') {
    wss_.handleUpgrade(request, socket, head, function done(ws) {
      wss_.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
    console.log('Endpoint is invalid. Please specify either "foo", "bar" or no endpoint.');
  }
});

server_http.listen(WS_PORT);
server_https.listen(WSS_PORT);
