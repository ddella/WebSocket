# Dockerizing WebSocket Server

## Introduction

The goal of this section is to show you how to get the **WebSocket Server** application into a Docker container. The guide is intended for development, and not for a production deployment. The guide also assumes you have a working Docker installation and a basic understanding of how a Node.js application is structured.

This is a three step process:

1. We assume that you have a working application in Node.js with a `package.json` file.
2. Build a Docker image for that application.
3. Instantiate a container from that image.

## Step 1 - Working Node.js app

The Node.js app, `server.js`, is in the directory `$pwd/server` with the `package.json` file.

```json
{
  "name": "server",
  "version": "1.0.0",
  "description": "WebSocket server on Docker",
  "author": "Daniel Della-Noce <danie@isociel.com>",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "start": "node .",
    "dev": "nodemon ."
  },
  "keywords": [],
  "license": "MIT",
  "dependencies": {
    "bufferutil": "^4.0.6",
    "http": "^0.0.1-security",
    "https": "^1.0.0",
    "url": "^0.11.0",
    "utf-8-validate": "^5.0.9",
    "ws": "^8.5.0"
  },
  "devDependencies": {
    "bufferutil": "^4.0.6",
    "http": "^0.0.1-security",
    "https": "^1.0.0",
    "nodemon": "^2.0.15",
    "url": "^0.11.0",
    "utf-8-validate": "^5.0.9",
    "ws": "^8.5.0"
  }
}
```

With the `package.json` file, run the command:

```command
npm install
```

this will generate a `package-lock.json` file which will be copied to your Docker image.


## Step 2 - Build the Docker image

You'll need to build a Docker image of the app.

### Create a file named `Dockerfile`

Create a file `Dockerfile` with the following:

```Dockerfile
FROM node:current-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

# exposed port for ws://
EXPOSE 6080
# exposed port for wss://
EXPOSE 6443

# If you are running your code in dev
# CMD [ "npm", "run", "dev" ]

# If you are running your code in production
CMD [ "node", "server.js" ]
```

### Create a file named  `.dockerignore`

Create a `.dockerignore` file in the same directory as your `Dockerfile` with following content:

```docker
node_modules
npm-debug.log
```

This will prevent your local modules and debug logs from being copied onto your Docker image.

### Build the image

Make sure you're in the directory that has the `Dockerfile` and run the following command to build the Docker image:

```docker
docker build . -t WebSocket
```

## Step 3 - Instantiate a container

The last step is to run the container from the image you just created. I'm not going through all the flags

Flags:

-d          Run container in background and print container ID
-e          Set environment variables
-p          Publish a container's port(s) to the host
--rm        Automatically remove the container when it exits
--ip        Specify the IPv4 address of the running container


If you want to map different TCP ports, you can pass them as environement variables to the Docker container. **Make sure that what's in the `-e WS_PORT=80` matches what's on the right side of the ':' in the port mapping `-p 9080:80`**. If you don't pass the TCP ports as environement variables, the default will be used.
>By defaults, the Node JS WebSocket server listen on both TCP port `6080` and `6443`.  


```Docker
docker run -d --rm --name wss --hostname wss --domainname example.com --ip 172.31.10.20 -p 9443:443 -p 9080:80 --network frontend -e WS_PORT=80 -e WSS_PORT=443 WebSocket
```

>In the preceeding example, the WebSocket server is started with ports `80` and `443` because `-e` switch was passed to the application. The Docker host maps TCP port `9080` to `80` and `9443` to `443` inside the Docker container, via switch `-p`.  

>In the example above:
>- Docker mapped the port `80`, inside of the container, to the port `9080` on your machine, aka Docker host.
>- Docker mapped the port `443`, inside of the container, to the port `9443` on your machine, aka Docker host.

## Troubleshooting

The last step is to run the container from the image you just created. I'm not going through all the flags

```command
# List container
docker ps -f name=wss

# Get only container ID
docker ps -f name=wss -q

# Print app output
docker logs $(docker ps -f name=wss -q)

# Enter the container
docker exec -it $(docker ps -f name=wss -q) /bin/sh

# Test the container with rtt client, in secure mode
node client-rtt.js wss://127.0.0.1:9443
```

## Useful Links

- [Node.js Docker app tutorial](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

## License

This project is licensed under the [MIT license](LICENSE).

[_^ back to top_](#Dockerizing-WebSocket-Server)
