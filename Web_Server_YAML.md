# Docker Compose for the Web Server container

### YAML file to start the Web Server

This is the `yaml` file to run the Web Server detached.

To start the web server, just type the following command, with the file `webserver.yml`.

```command
docker compose -f webserver.yml --project-name webserver up -d
```

```yaml
# filename: webserver.yml
networks:
   frontend:
      name: frontend

services:
  webserver:
    image: php8_nginx
    volumes:
      - type: bind
        source: $PWD/www
        target: /www
      - type: bind
        source: $PWD/logs
        target: /var/log/nginx
    ports:
      - "8080:80"
      - "8443:443"
    restart: unless-stopped
    environment:
      - TZ=EAST+5EDT,M3.2.0/2,M11.1.0/2
      - TIMEZONE=America/New_York
    hostname: webserver
    container_name: webserver
    domainname: example.com
    networks:
      frontend:
        ipv4_address: 172.31.10.10
```

## Useful Links

- [The Compose Specification](https://github.com/compose-spec/compose-spec/blob/master/spec.md)
