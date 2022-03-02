import asyncio
import pathlib
import ssl
import websockets
import logging
import sys

HOSTNAME = '127.0.0.1'
PORT = 0
CERTIFICATE = ''

async def echo(websocket):
    async for message in websocket:
        await websocket.send(message)

async def main():
    async with websockets.serve(echo, HOSTNAME, PORT, ssl=ssl_context):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    if len(sys.argv) < 3 or len(sys.argv) > 4:
        print('Usage: server.py <hostname/ip> <tcp port> [certificate file]')
        exit(1)

    print(f"Arguments count: {len(sys.argv)}")
    for i, arg in enumerate(sys.argv):
        print(f"Argument {i:>2}: {arg}")

    HOSTNAME = sys.argv[1]
    PORT = sys.argv[2]
    try:
        CERTIFICATE = sys.argv[3]
    finally:
        if CERTIFICATE:
            print('WebSocket SECURE - WSS://')
            ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            localhost_pem = pathlib.Path(__file__).with_name(CERTIFICATE)
            ssl_context.load_cert_chain(localhost_pem)
        else:
            print('WebSocket WS://')
            ssl_context = None

        logger = logging.getLogger('websockets')
        logger.setLevel(logging.DEBUG)
        logger.addHandler(logging.StreamHandler())
        asyncio.run(main())
