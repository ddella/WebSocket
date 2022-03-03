# WebSocket Server certificate

## Introduction

Steps to create the SSL/TLS certificate for the WebSocket server `wss://`.

Create a directory named `ssl` and change directory.

```command
mkdir ssl
cd sll
```

## Generate the certificate
1. create a self-signed root certificate
```command
openssl genrsa -out websocket_rootCA.key 4096
```
2. generate your root certificate
```command
openssl req -x509 -new -nodes -key websocket_rootCA.key -sha256 -days 3650 -out websocket_rootCA.crt -config websocket.cnf -extensions v3_ca -subj "/CN=websocket Root CA"
```
3. create another private key
```command
openssl genrsa -out websocket.key 4096
```
4. generate the CSR
```command
openssl req -new -key websocket.key -out websocket.csr -config websocket.cnf -extensions v3_req
```
5. create the certificate based on the CSR
```command
openssl x509 -req -in websocket.csr -CA websocket_rootCA.crt -CAkey websocket_rootCA.key -CAcreateserial -out websocket.crt -days 3650 -sha256 -extfile websocket.cnf -extensions v3_req
```
6. Concatenate the certificate and private key in one `pem`file.
```command
cat websocket.crt websocket.key > websocket.pem
```

## Tests (optional)

### check private key
```command
openssl rsa -in websocket_rootCA.key -check
```

#### check whether the certificate is valid, trusted, and complete
```command
openssl s_client -connect 127.0.0.1:8766
```

### Check who has issued the SSL certificate
```command
echo | openssl s_client -servername 127.0.0.1 -connect 127.0.0.1:8766 2>/dev/null | openssl x509 -noout -issuer
```

### Check whom the SSL certificate is issued to
```command
echo | openssl s_client -servername 127.0.0.1 -connect 127.0.0.1:8766 2>/dev/null | openssl x509 -noout -subject
```

### Check for what dates the SSL/TLS certificate is valid
```command
echo | openssl s_client -servername 127.0.0.1 -connect 127.0.0.1:10443 2>/dev/null | openssl x509 -noout -dates
```

