# WebSocket Client Server

### Introduction

This workshop is about building a client and server WebSocket on different Docker containers.

- Web Server on Nginx, that will host the JavaScript (the Client)
- Secure and Non-Secure WebSocket Server in Node JS (the Server)

The WebSocket Protocol enables bi-directional, full duplex communications protocol between a client and a server. It provides a persistent connection between them and both parties can sending data at any time. It is commonly used in modern web applications for streaming data and other asynchronous traffic. The goal of this technology is to provide a mechanism for browser-based applications that need two-way communication with servers without the need to open multiple HTTP connections.

![WebSocket Protocol](images/protocol.jpg "WebSocket Protocol")

>The WebSocket specification defines two URI schemes:   
>ws-URI = "ws:" "//" host [ ":" port ] "/" [path [ "?" query ]] (ws://websocket.example.com:6080/foo)  
>wss-URI = "wss:" "//" host [ ":" port ] "/" [path [ "?" query ]] (wss://websocket.example.com:6443/foo)  

In this workshop, I've 

1. Client - Web Broswer:
The client is a JavaScript running on the browser. It will initiate the WebSocket connection. The JavaScript client implements both secure and non-secure WebSocket communication. I took the code for the frontend, HTML and JavaScript, [here](https://www.pegaxchange.com/2018/03/23/websocket-client/).

2. Client - Node JS:
The client is a simple Node JS script. In this workshop, I implemented a simple script to get the round trip time of the connection.

3. Server - Node JS:

The server portion is implemented in Node JS. You can use any programming language for the server side like PHP, Go, Python, ... I took the code from the official Node JS librairy and made some small modification. Check the GitHub page [here](https://github.com/websockets/ws).

The WebSocket server accepts different `endpoint`. The `endpoint` is the `path` in the URL. See below the valid `path`. Anything outside of that will be rejected by the server and the connection will be terminated. All of the request can be made in secure or non-secure mode.

1. `ws[s]://hostname:port/`
2. `ws[s]://hostname:port/foo`
3. `ws[s]://hostname:port/bar`
4. `ws[s]://hostname:port/rtt`

> The URL `ws[s]://hostname:port/rtt` makes sense only with the Node JS client script 😉.

### Architecture

The workshop includes two servers, each in a Docker container on a _Docker custom network_.

- Nginx web server with **http://** on `TCP/8080` and **https://** on `TCP/8443`.
- Node JS WebSocket with **http://** / **ws://** on port `TCP/6080` and **https://** / **wss://** on port `TCP/6443`.

The Nginx web server hosts a standard HTML page to enter the information needed to establish a WebSocket connection. The other server is the Node JS WebSocket server.

>All the containers run on the same _Docker custom network_. This workshop is not about _Docker custom network_ but I encourage you to run your containers in custom network to get the added value of a DNS server. The following command was used to create the `frontend` network.
>
>```command
>docker network create --driver=bridge --subnet=172.31.10.0/24 --ip-range=172.31.10.128/25 --gateway=172.31.10.1 frontend
>```

![WebSocket Architecture](images/architecture.jpg "Architecture")

### SERVER

The WebSocket server is a web server and a WebSocket server. It listens on TCP ports `TCP/6080` and `TCP/6443`. The client makes it's first request via HTTP/S asking for a connection upgrade. If the server is a real WebSocket server, it will accept the request and upgrade the procotol to WebSocket.

>The WebSocket server multiplex HTTP protocol and WebSocket protocol on the same port.

This is a Wireshark packet capture of the handshake from the client asking to `upgrade` the protocol to WebSocket.

      GET /foo HTTP/1.1
      Host: 127.0.0.1:6080
      Connection: Upgrade
      Pragma: no-cache
      Cache-Control: no-cache
      User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36
      Upgrade: websocket
      Origin: http://localhost:8080
      Sec-WebSocket-Version: 13
      Accept-Encoding: gzip, deflate, br
      Accept-Language: en-US,en;q=0.9,fr;q=0.8
      Sec-WebSocket-Key: n6L8hzDkt+MaFqHE3iefTQ==
      Sec-WebSocket-Extensions: permessage-deflate; client_max_window_bits

This is a Wireshark packet capture of the handshake from the server.

      HTTP/1.1 101 Switching Protocols
      Upgrade: websocket
      Connection: Upgrade
      Sec-WebSocket-Accept: nmT+QYqF1fR7iiYoLneQlU9Vw+I=

## Prerequisites

Before you begin with this workshop, you'll need basic understanding of the following technologies:

- Familiarity with [Docker](https://www.docker.com/).
- Familiarity with [JavaScript](https://www.w3schools.com/js/).
- Familiarity with [Node JS](https://www.w3schools.com/nodejs/).
- Familiarity with [WebSockets - RFC6455](https://datatracker.ietf.org/doc/html/rfc6455).

## Step 1 - Clone all the files

Copy all the files from GitHub to your local drive and change directory. From now on, `$PWD` refers to the `WebSocket` directory.

```command
git clone https://github.com/ddella/WebSocket.git
cd WebSocket
```

## Step 2 — Web Server

You need a web server to present a web page for the users to enter all the parameters needed to create the WebSocket session. The magic to create the TCP connection is done within the JavaScript on the client browser. Most modern browser support WebSocket.

The web page lets you enter the following information to create the WebSocket session:

- The hostname/IP address of the WebSocket server.
- The TCP port the server listens on.
- The endpoint (optional).
- The WebSocket protocol, either non-secure `ws://` or secure `wss://` connection.

I made a workshop on building a simple web server based on Alpine Linux with Nginx and PHP8. Take a look [here](https://github.com/ddella/PHP8-Nginx). The container is only 31Mb. This is the command to start the container in a custom network `frontend`.

```command
docker run --rm -d -p 8080:80 -p 8443:443 --name webserver --hostname webserver --domainname example.com --ip 172.31.10.10 --env TZ='EAST+5EDT,M3.2.0/2,M11.1.0/2' --env TIMEZONE='America/New_York' --network frontend  -v $PWD/www/:/www -v $PWD/logs/:/var/log/nginx php8_nginx
```

>If you prefer Docker Compose, see [web server YAML](Web_Server_YAML.md)

The web server directory, inside the container, is mounted on your local drive in `$PWD/www/`. You will be able to change the HTML/CSS/JavaScript files without needing to restart the web server. I also mounted a local directory for the web server logs, in case you need to troubleshoot 😉.

If everything works as expected, you should have a web server in a Docker container that you can reach with your favourite browser with the url `http://localhost:8080`.

![Web server main web page](images/not-connected.png "Main Web Page")

## Step 3 — WebSocket Server

The WebSocket server runs on Node JS. I used Docker container based on Alpine Linux 3.15 and Node JS 16.14. The image is only 168MB. You don't need to build the image, just pull it from Docker hub.

Pull the Node JS image:

```Docker
docker pull node:current-alpine
```

### CREATE THE CERTIFICATE FOR SECURE WEBSOCKET `wss://`

If you are planning to use sercure WebSocket `wss://`, you need to get an `SSL/TLS` certificate.

Check [this document](./certificate.md) for how to create a **self-signed** certificate.

### START THE WEBSOCKET SERVER

This container has the latest version of Node JS.

1. Open a `terminal` and change directory to `$PWD/server`.

```command
cd server
```

2. Start the WebSocket server with a shell.

This command starts the WebSocket server container and opens a shell. We need to install some modules before we're ready to start the WebSocket server.

```Docker
docker run -it --rm --name wss --hostname wss --domainname example.com --ip 172.31.10.20 --mount type=bind,source="$(pwd)",target=/run -w /run --network frontend node:current-alpine /bin/sh
```

3. Install Node JS modules.

Type the following commands in the shell of the container started in the previous step.

```command
# install the WebSocket module
npm install --save-dev ws

# helps develop node.js based applications
npm install --save-dev nodemon

# masking and unmasking the data payload of the WebSocket frames
npm install --save-dev bufferutil

# Allows to efficiently check if a message contains valid UTF-8
npm install --save-dev utf-8-validate

# let's terminate the container. We'll start it again in the next step
exit
```

>The modules will be installed in the container `/run` directory, but since it's map to your local drive, the modules will be installed on your local drive inside the directory you created for this workshop. The modules should be installed in `server/node_modules`.

4. Start the WebSocket server.

This command starts one WebSocket server with two listening ports, one for non-secure mode, `ws://`, and one for secure mode, `wss://`.
>The Node JS WebSocket server listen on both TCP port `6080` and `6443`, by defaults.  
>- The Docker host maps TCP port `9080` to `6080` inside the Docker container.  
>- The Docker host maps TCP port `9443` to `6443` inside the Docker container.  

![Port Mapping](images/port_mapping.jpg "Port Mapping")

If you want to map different TCP ports, you can pass them as environement variables to the Docker container. **Make sure that what's in the `--env WS_PORT=80` matches what's on the right side of the ':' in the port mapping `-p 9080:80`**. If you don't pass the TCP ports as environement variables, the default will be used. See above for the default values.

```Docker
docker run -it --rm --name wss --hostname wss --domainname example.com --ip 172.31.10.20 -p 9443:443 -p 9080:80 --mount type=bind,source="$(pwd)",target=/run -w /run --network frontend --env WS_PORT=80 --env WSS_PORT=443 node:current-alpine npm run dev
```

>If you prefer Docker Compose, see [WebSocket server YAML](WebSocket_YAML.md)

## Step 4 — Test the WebSocket Server

### Test via the web server

1. Start your favorite browser.
2. Type the url `localhost:8080`.
3. Fill the information and press `connect`.
4. Type a message in the `input message box` and hit the button `Send Message`. If successful, the server will send the message back in the box below.

>The web server sends a standard HTML page with a JavaScript. The HTML page has fields for the information needed to start the WebSocket session. The JavaScript will initiate the connection to the WebSocket server. The browser is the `client` here.

![Successful connection](images/connected.png "Success")

>Those are the different `endpoint` accepted by the server. The endpoint `/rtt` does only make sense with the Node JS client. If you enter an `endpoint` not defined, the server sends a error message and close the session. This is per design.
>>- /  
>>- /foo  
>>- /bar  
>>- /rtt  

### Test via a Node JS client application script

The Node JS command line client initiate a connection to the server. The URL is passed as an argument to the script. The client just sends the time, in `ms`, to the server and waits for the server to send it back. It calculates the round-trip time and prints it. The server has been built to close the WebSocket after sending the time.

You need to have Node JS installed locally, if you don't or don't want to install it locally, just run the script from another Node JS Docker container.

Summary:
- Run step #2 if you want to test the client from a Docker container without installing Node JS locally.
- Run step #3 if you want to test the client from your local computer with Node JS installed locally.

1. Open a `terminal` and change the directory to `$PWD/server`.

```command
cd server
```

2. Run the client from a Docker container

If you don't want to install Node JS locally, just start another Node JS container and start the client from that container. This client container will map the same local drive as the server and start the client from the command line.

![Client inside Docker container](images/client_inside.jpg "Client inside Docker container")

Start a temporary Node JS container, jump into the shell and run the command from there. When done testing, just type `exit` and the container will terminate. No need to specify a static IP for the client, DHCP will be just fine. Since the client script is in the same directory as the server, the same directory is mounted but this time in `readonly`.

```command
docker run -it --rm --name wsc --hostname wsc --domainname example.com --mount type=bind,source="$(pwd)",target=/run,readonly -w /run --network frontend node:current-alpine /bin/sh
```

From the command line, the prompt should look like this `/run #`. Just type either or both commands to start the client. Make sure you specify the correct port number. **Don't forget, you are INSIDE the network __frontend__**. The IP address if the WebSocket server is it's real IP address inside the network `frontend`.

For `non secure` WebSocket:

```command
node client-rtt.js ws://172.31.10.20:6080
```

For `secure` WebSocket:

```command
node client-rtt.js wss://172.31.10.20:6443
```

3. Run the client from the command line.

If you have Node JS installed locally, you can start the client from the host command line. The IP address of the WebSocket server is `localhost` and the TCP ports are the external one, not the one configured on the server.

![Client outside Docker container](images/client_outside.jpg "Client outside Docker container")

For `non secure` WebSocket:

```command
node client-rtt.js ws://127.0.0.1:9080
```

For `secure` WebSocket:

```command
node client-rtt.js wss://127.0.0.1:9443
```

The output of the client should be:

```txt
connected
Round-Trip Time: 2 ms
disconnected
```

## Clean up

When you're done, it's always a good idea to clean everything. If you followed all the steps, you should have two Docker containers running. For the WebSocket servers, just press `CTRL-C` and it should terminate. The only one left is the Web Server. Following is the command to terminate the web server container.

```command
docker rm -f webserver
```

If you started the WebSocket server with `docker compose`, you need to remove it, as there's no such thing as `--rm`.

```command
docker rm -f wss
```

Check that all of the Docker container you started are terminated.

```command
docker ps -a
```

## wscat

Check [wscat](https://github.com/websockets/wscat). It's a very good WebSocket client.

To use it without installing the module, just `cd $PWD/wscat` and install the dependency locally.

```command
npm install --save-dev https-proxy-agent
npm install --save-dev commander
npm install --save-dev read
npm install --save-dev readline
npm install --save-dev tty
npm install --save-dev ws
```

To use it against your WebSocket server, type the following. It will try to connect to a WebSocket server
- with a self-signed certificate
- set a cookie
- use basic authentication

```command
node wscat.js -H Set-Cookie:id=0123456789ABCDEF -n --auth myUsername:mySecretPassword -c wss://localhost:6443/foo
```

## Useful Links

- [Nice basic WebSocket tutorial](https://blog.teamtreehouse.com/an-introduction-to-websockets)
- [How Do Websockets Work?](https://sookocheff.com/post/networking/how-do-websockets-work/)
- [WebSocket Client frontend](https://www.pegaxchange.com/2018/03/23/websocket-client/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [WebSocket client API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications)
- [ws: a Node.js WebSocket library](https://www.npmjs.com/package/ws)
- [WebSockets - Living Standard](https://websockets.spec.whatwg.org/)
- [HTTP protocol and WS protocol reuse the same port](https://programmer.group/in-nodejs-http-protocol-and-ws-protocol-reuse-the-same-port.html)
- [Sub Protocol](https://medium.com/hackernoon/implementing-a-websocket-server-with-node-js-d9b78ec5ffa8)
- [wscat (very good WebSocket client)](https://github.com/websockets/wscat)

## License

This project is licensed under the [MIT license](LICENSE).

[_^ back to top_](#Websocket-Client-Server)
