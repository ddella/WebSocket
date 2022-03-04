
# WebSocket Client Server

### Introduction

This workshop is about building a client and server WebSocket on different Docker containers.

- Web Server on Nginx, that will host the JavaScript (the Client)
- Secure WebSocket Server in Python (the Server)
- Non-Secure WebSocket Server in Python (the Server)

The WebSocket Protocol enables bi-directional, full duplex communications protocol between a client and a server. It provides a persistent connection between them and both parties can sending data at any time. It is commonly used in modern web applications for streaming data and other asynchronous traffic. The goal of this technology is to provide a mechanism for browser-based applications that need two-way communication with servers without the need to open multiple HTTP connections.

<a title="Brivadeneira, CC BY-SA 4.0 &lt;https://creativecommons.org/licenses/by-sa/4.0&gt;, via Wikimedia Commons" href="https://commons.wikimedia.org/wiki/File:Websocket_connection.png"><img width="256" alt="Websocket connection" src="https://upload.wikimedia.org/wikipedia/commons/1/10/Websocket_connection.png"></a>

>The WebSocket specification defines two URI schemes:   
>ws-URI = "ws:" "//" host [ ":" port ] path [ "?" query ]   
>wss-URI = "wss:" "//" host [ ":" port ] path [ "?" query ]   

The client is the browser with a simple JavaScript that will initiate the WebSocket. It could be either `ws://`, which is the equivalent to `http://`, or secure WebSocket `wss://`, which is the equivalent to `https://`. In this workshop, I implemented both secure and non-secure WebSocket server. I took the code for the frontend, HTML and JavaScript, [here](https://www.pegaxchange.com/2018/03/23/websocket-client/).

The server portion is implemented in Python. You can use any programming language for the server side (PHP, Go, NodeJS, ...). I took the code from Manos Pithikos. Check his GitHub page [here](https://github.com/Pithikos/python-websocket-server).

### Architecture

All the containers run on the same _Docker custom network_. This workshop is not about _Docker custom network_ but I encourage you to run your containers in custom network to get the added value of a DNS server. The following command was used to create the `frontend` network.

```command
docker network create --driver=bridge --subnet=172.31.10.0/24 --ip-range=172.31.10.128/25 --gateway=172.31.10.1 frontend
```

The Docker containers expose the following TCP ports on the Docker host:

- Nginx Web Server **http://** on `TCP/8080`.
- Nginx Web Server **https://** on `TCP/8443`.
- WebSocket Server **ws://** on `TCP/9080`.
- WebSocket Server **wss://** on `TCP/9443`.

![WebSocket Architecture](images/architecture.jpg "Architecture")

## Prerequisites

Before you begin with this workshop, you'll need basic understanding of the following technologies:

- Familiarity with [Docker](https://www.docker.com/).
- Familiarity with [Python](https://www.python.org/).
- Familiarity with [JavaScript](https://www.w3schools.com/js/default.asp).
- Familiarity with [WebSockets - RFC6455](https://datatracker.ietf.org/doc/html/rfc6455).

## Step 1 - Clone all the files

Copy all the files from GitHub to your local drive and change directory. From now on, `$PWD` refers to the `WebSocket` directory.

```command
git clone https://github.com/ddella/WebSocket.git
cd WebSocket
```

## Step 2 — Web Server

You need a web server to present a web page for the users to enter all the parameters needed to create the WebSocket. The magic to create the TCP connection is done within the JavaScript on the client browser (Firefox/Chrome/Safari).

The web page lets you enter the following information:

- Choose between WebSocket `ws://` or secure WebSocket `wss://` connection.
- The IP address of the WebSocket server.
- The TCP port the server listens on.

I made a workshop on building a simple web server based on Alpine Linux with Nginx and PHP8. Take a look [here](https://github.com/ddella/PHP8-Nginx). The container is only 31Mb. This is the command to start the container in a custom network `frontend`.

```command
docker run --rm -d -p 8080:80 -p 8443:443 --name webserver --hostname webserver --domainname example.com --ip 172.31.10.10 --env TZ='EAST+5EDT,M3.2.0/2,M11.1.0/2' --env TIMEZONE='America/New_York' --network frontend  -v $PWD/www/:/www -v $PWD/logs/:/var/log/nginx php8_nginx
```

The web server directory, inside the container, is mounted on your local drive in `$PWD/www/`. You will be able to change the HTML/CSS/JavaScript files without needing to restart the web server. I also mounted a local directory for the web server logs, in case you need to troubleshoot 😉.

If everything works as expected, you should have a web server in a Docker container that you can reach with your favourite browser with the url `http://localhost:8080`.

![Web server main web page](images/not-connected.png "Main Web Page")

## Step 3 — WebSocket Server

The WebSocket server runs on Python. I built a Python Docker container based on Alpine Linux 3.15. The image is only 55.6MB. When building the image, only the Python package `websockets` is required. The server script is outside the container.

I still like to have a `requirements.txt` file to get the package(s) when building a Python container. If you want more Python packages, just add them at the end of the file.

```txt
websockets==10.2
```

### CREATE THE CERTIFICATE FOR SECURE WEBSOCKET `wss://`

Secure WebSocket requires a standard `SSL/TLS` certificate, the same way as `https`. In this workshop, we'll use a **self-signed** certificate. The tricky part is to have this self-signed certificate being accepted by Firefox/Chrome/Safari. This is the part that I struggled the most. Troubleshooting self-signed certificate can be hard 😀.

If you're on a Linux or macOS, use `openssl`. Just type the following commands to generate the self-signed certificate.

```command
openssl genrsa -out ssl/websocket_rootCA.key 4096
openssl req -x509 -new -nodes -key ssl/websocket_rootCA.key -sha256 -days 3650 -out ssl/websocket_rootCA.crt -config ssl/websocket.cnf -extensions v3_ca -subj "/CN=websocket Root CA"
openssl genrsa -out ssl/websocket.key 4096
openssl req -new -key ssl/websocket.key -out ssl/websocket.csr -config ssl/websocket.cnf -extensions v3_req
openssl x509 -req -in ssl/websocket.csr -CA ssl/websocket_rootCA.crt -CAkey ssl/websocket_rootCA.key -CAcreateserial -out ssl/websocket.crt -days 3650 -sha256 -extfile ssl/websocket.cnf -extensions v3_req
cat ssl/websocket.crt ssl/websocket.key > server/websocket.pem
```

The file `websocket.pem` is your self-signed certificate. It needs to be marked as **trusted for this account** in your OS.

1. In the case of macOS, open the file `server/websocket.pem` in KeyChain. Right click -> Open With -> KeyChain Access (default)

![untrusted new certificate](images/keychain1.png)

2. Double clink on it and expand the **Trust**.

3. Select `Always Trust` for **Secure Sockets Layer (SSL)**. This is the minimal that is needed.

![always trust](images/keychain2.png)

4. Close this windows by pressing the **Close button** on the top left corner (red circle). You will be asked for you credential.

5. The certificate status should be `This certificate is marked as trusted for this account`.

![always trust](images/keychain4.png)

#### IMPORT ROOT CERTIFICATE AUTHORITIES (**FIREFOX ONLY**)

If you use **Firefox**, you might get the error `SEC_ERROR_UNKNOWN_ISSUER`. It can be easily fixed by permitting Firefox to import any root certificate authorities (CAs) that have been added to the operating system.

**DON'T FORGET TO ENFORE THE CHECK** back when you're done.

>**Warning**: Changing advanced preferences can affect Firefox's stability and security. This is recommended for **advanced users only**.

1. Open Mozilla Firefox on your computer.
2. In Firefox window, copy-paste `about:config` in the address bar and hit Enter.
3. Now, you will receive a message of caution. Click on `Accept the Risk and Continue` to proceed further. Advanced Preferences tab will be opened.
4. In the Advanced Preferences tab, click on the Search box and type “security.enterprise“.
5. In the search results, you will notice `security.enterprise_roots.enabled` and the status of it, normally stating `false`.
6. Click on the arrow sign of the particular option to switch its value to `true`.
7. Refresh the Websocket page.

![security.enterprise_roots.enabled](images/firefox-SEC_ERROR_UNKNOWN_ISSUER.jpg "Firefox")

Check the how-to on Mozilla's web site: ![Enable Enterprise Roots](https://support.mozilla.org/en-US/kb/how-disable-enterprise-roots-preference/)

### CREATE THE PYTHON DOCKER CONTAINER

This container contains the latest version of Python. It is basically a Python interpreter. When you start the container, you specify the server script, the `.py` file, in the command line.

1. Open a `terminal` and change directory to `$PWD/Python-Docker`.

```command
cd Python-Docker
```

2. Get the Python image from [Docker hub](https://hub.docker.com/_/python/). This is the official image based on Alpine Linux. I wanted to keep the image as small as possible.

```command
docker pull python:alpine3.15
```

3. Create a file named `Dockefile`, with the following.

```docker
FROM python:alpine3.15
WORKDIR /usr/src/app
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt
```

4. Build the Docker image

Make sure you type the command as is. The `.` at the end of the command is important.
```command
docker build -t websocket_server .
```

If everything works as expected, you now have a new container called `websocket_server`.

      % docker images
      REPOSITORY               TAG       IMAGE ID       CREATED         SIZE
      websocket_server         latest    23ad42770a82   1 minute ago    55.6MB

5. Run a WebSocket server in Secure mode `wss://`

This command starts the WebSocket server in secure mode `wss://`. It exposes TCP port `9443`. Make sure you have the Python script in the directory `server` as well as the certificate. The mounted directory is readonly, since I will also start a non-secure WebSocket server from the same script.

```command
docker run -it --rm --name wss --hostname wss --domainname example.com --ip 172.31.10.20 -p 9443:9443 --network frontend --mount type=bind,source="$(pwd)"/server,target=/usr/src/myapp,readonly -w /usr/src/myapp websocket_server python secure_ws.py 172.31.10.20 9443 websocket.pem
```

6. Run a WebSocket server in non-secure mode `ws://`

This command starts the WebSocket server in non-secure mode `ws://`. It exposes TCP port `9080`.

```command
docker run -it --rm --name ws --hostname ws --domainname example.com --ip 172.31.10.21 -p 9080:9080 --network frontend --mount type=bind,source="$(pwd)"/server,target=/usr/src/myapp,readonly -w /usr/src/myapp websocket_server python secure_ws.py 172.31.10.21 9080
```

>You can start both `ws://` and `wss://` servers since they listen on different TCP port and the mounted directory is readonly. It's the same Python script, I just did a small hack so if you don't supply a certificate it starts in non-secure mode.

## Step 4 — Test the WebSocket Server

Start your browser, type this url `localhost:8080`, fill the information and press `connect`. Type a message in the `input message box` and hit the button `Send Message`, if successful, the server will send the message back in the box below. If the connect button is greyed out, it worked !

![Successful connection](images/connected.png "Success")

## TEST THE CERTIFICATE

In case you run into problem with the secure WebSocket, you can use the commands below to check whether the certificate is valid, trusted, and complete.
Open a `terminal` window.

```command
openssl s_client -connect 127.0.0.1:9443
```

You can also use `curl`.

>The `-k` allows curl to proceed and operate even for server connections otherwise considered insecure, like self-signed certificate.

```command
curl -kvI https://127.0.0.1:9443
```

## Clean up

When you're done, it's always a good idea to clean everything. If you followed all the steps, you should have three Docker containers running. For the WebSocket servers, just press `CTRL-C` and they should terminate. The only one left is the Web Server. Following is the command to terminate it.

```command
docker rm -f webserver
```

## Useful Links

- [Nice basic WebSocket tutorial](https://blog.teamtreehouse.com/an-introduction-to-websockets)
- [How Do Websockets Work?](https://sookocheff.com/post/networking/how-do-websockets-work/)
- [WebSocket Client frontend](https://www.pegaxchange.com/2018/03/23/websocket-client/)
- [Python websockets module](https://websockets.readthedocs.io/en/stable/index.html)
- [Manos Pithikos Python WebSocket server](https://github.com/Pithikos/python-websocket-server)
- [Writing WebSocket client applications](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications)
- [Writing WebSocket servers](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers)

## License

This project is licensed under the [MIT license](LICENSE).

[_^ back to top_](#Websocket-Client-Server)
