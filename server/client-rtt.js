/**
 * Calculate the RTT between a WebSocket client and the server.
 * 
 * For a non-secure request:
 *      node client-rtt.js ws://127.0.0.1:6080
 * 
 *  * For a secure request:
 *      node client-rtt.js wss://127.0.0.1:6443
 */
import WebSocket from 'ws';

let wss = null;
let url = null;
let start_time = 0;

const myArgs = process.argv.slice(2);
if (myArgs.length != 1) {
    console.log('usage: node client-rtt.js <URI>');
    console.log('    example for non-secure: node client-rtt.js ws://127.0.0.1:6080');
    console.log('    example for secure:     node client-rtt.js wss://127.0.0.1:6443');
    process.exit(1);
}

const URI = myArgs[0];
url = URI + '/rtt';

wss = new WebSocket(url, {
    rejectUnauthorized:false, // accept self-signed certificate
    }
);

wss.on('error', (error) => {
    console.log(error + ': ' + url);
    process.exit(1);
});

wss.on('open', function open() {
  console.log('connected');
  start_time = Date.now();
  wss.send(start_time);
});

wss.on('close', function close() {
  console.log('disconnected');
});

wss.on('message', function message(data) {
  const now = Date.now();
  const rtt =  now - start_time;
  // console.log(`start_time=${start_time}  Rx server=${data}  now=${now}  rtt=${rtt}`);
  console.log(`Round-Trip Time: ${rtt} ms`);
});
