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
 *    # create a private Key
 *    openssl genrsa -out ssl/ws-private-key.pem 4096
 *    
 *    # create a CSR (certificate signing request)
 *    openssl req -new -key ssl/ws-private-key.pem -out ssl/ws-csr.pem -config ssl/websocket.cnf -extensions v3_req
 *    
 *    # it's time to pretend that we're a cool signing authority.
 *    openssl x509 -req -in ssl/ws-csr.pem -signkey ssl/ws-private-key.pem -out ssl/ws-public-cert.pem -days 3650 -sha256 -extfile ssl/websocket.cnf -extensions v3_req
 * 
 *    ssl/ws-public-cert.pem => the certificate
 *    ssl/ws-private-key.pem => the key
 * 
 */

import * as http from 'http'; //ES 6
import * as https from 'https'; //ES 6
import { readFileSync } from 'fs';
import { WebSocketServer } from 'ws';

const WS_PORT = process.env.WS_PORT ? process.env.WS_PORT : 6080;
const WSS_PORT = process.env.WSS_PORT ? process.env.WSS_PORT : 6443;

const options = {
  cert: readFileSync('ssl/websocket.crt'),
  key: readFileSync('ssl/websocket.key')
  // cert: readFileSync('ssl/ws-public-cert.pem'),
  // key: readFileSync('ssl/ws-private-key.pem')
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
  ws.send('Connected to "/". No endpoint specified...');
  ws.on('close', () => {
    console.log('Connection closed');
    // clearInterval(interval);
  });
});

function upgrade(request, socket, head) {
  // const myURL = new URL(request.url, `https://${request.headers.host}`);
  // const pathname = myURL.pathname;
  const pathname = request.url;

  // request.method, URL and httpVersion
  // console.log(request.method + ' ' + request.url + ' HTTP/' + request.httpVersion);

  // basic authentication
  const authheader = request.headers.authorization;
  // console.log(request.headers);

  // print the cookie
  var setcookie = request.headers["set-cookie"];
  if ( setcookie ) {
    setcookie.forEach(
      function ( cookiestr ) {
        console.log( "COOKIE:" + cookiestr );
      }
    );
  }

  if (!authheader) {
      console.log('No Authenticated Header found.');
  } else {
    const auth_type = new Buffer.from(authheader.split(' ')[0]).toString();
    switch(auth_type.toUpperCase()) {
      case 'BASIC':
        const [username, password] = new Buffer.from(authheader.split(' ')[1], 'base64').toString().split(':');
        console.log(auth_type + ' Authenticated Header found => ' + 'Username: ' + username + ' - Password: ' + password);
        break;
      default:
        console.log('Authentication header found but unknown type: ' + auth_type);
        break;
    }
  }

  // Make sure that we only handle WebSocket upgrade requests
  if (request.headers['upgrade'] !== 'websocket') {
    socket.end('HTTP/1.1 400 Bad Request');
    console.log('HTTP/1.1 400 Bad Request: "upgrade request" is not "websocket". Received: ' + '[' + request.headers['upgrade'] + ']');
    return;
  }

  // Read the subprotocol from the client request headers:
  const protocol = request.headers['sec-websocket-protocol'];
  if (protocol) {
    console.log('sec-websocket-protocol: ' + protocol);
    // if sub-protocol are provided, they will be formatted as a comma-delimited string.
  } else {
    console.log('sec-websocket-protocol is EMPTY');
  }

  // depending on the 'endpoint' value, we send the request to the appropriate WebSocket Server handler (wss_xxxx)
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
}

// HTTPS 'upgrade' request to wss://
server_https.on('upgrade', (request, socket, head) => {
  console.log('HTTPS upgrade request');
  upgrade(request, socket, head);
});

// HTTP 'upgrade' request to ws://
server_http.on('upgrade', (request, socket, head) => {
  console.log('HTTP upgrade request');
  upgrade(request, socket, head);
});

server_http.listen(WS_PORT);
server_https.listen(WSS_PORT);
console.log('HTTP server listening on port ' + WS_PORT);
console.log('HTTPS server listening on port ' + WSS_PORT + '\r\n');
