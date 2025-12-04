// src/socket/SocketClient.ts
import io from 'socket.io-client';

export function createSocket(token: string) {
  return io('https://socket.3c.plus', {
    transports: ['websocket'],
    query: { token }
  });
}
