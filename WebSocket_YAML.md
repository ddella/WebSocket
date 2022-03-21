# Docker Compose for the WebSocket container

### YAML file to start the WebSocket Server

This is the `yaml` file to run the WebSocket Server `attached`.

To start the WebSocket server, just type the following command, with the file `WebSocket.yml`.

```command
docker compose -f WebSocket.yml --project-name wss up
```

```yaml
# filename: WebSocket.yml
networks:
   frontend:
      name: frontend

services:
  WebSocket:
    image: node:current-alpine
    working_dir: /run
    command: npm run dev
    volumes:
      - type: bind
        source: $PWD
        target: /run
    ports:
      - "9080:6080"
      - "9443:6443"
    restart: "no"
    environment:
      - WS_PORT=6080
      - WSS_PORT=6443
    hostname: wss
    container_name: wss
    domainname: example.com
    networks:
      frontend:
        ipv4_address: 172.31.10.20
```

## Useful Links

- [The Compose Specification](https://github.com/compose-spec/compose-spec/blob/master/spec.md)
