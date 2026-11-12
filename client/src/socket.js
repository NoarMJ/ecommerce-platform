import { io } from 'socket.io-client'

// Socket.IO connects to the server's origin, not to the /api path.
const SOCKET_URL = new URL(import.meta.env.VITE_API_BASE_URL, window.location.origin).origin

export const socket = io(SOCKET_URL, {
  transports: ['websocket'], // never fall back to HTTP long-polling
  withCredentials: true, // sends the access cookie during the handshake
  autoConnect: false,    // connected by the payment page, not on import
})
