import { io, Socket } from 'socket.io-client';

// Same `??` reasoning as lib/api.ts.
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;
let socketToken: string | null = null;

/**
 * One connection per tab, authenticated once at handshake with the current
 * access token — see EventsGateway's doc comment for why there's no
 * per-message re-validation. Reconnects only when the token actually
 * changes (e.g. after a silent refresh), not on every render.
 */
export function connectSocket(token: string): Socket {
  // Checking socketToken alone (not socket.connected) matters: multiple
  // consumers (layout, NotificationBell, Inbox) all call this on mount, and
  // without this a second call racing the first handshake would tear down
  // and recreate the connection before it ever finished connecting.
  if (socket && socketToken === token) return socket;
  socket?.disconnect();
  socketToken = token;
  // socket.io-client only treats a missing/undefined URL as "connect to the
  // current page's own origin" — an empty string gets parsed as a literal
  // URL instead, so the falsy check here is deliberate.
  socket = io(SOCKET_URL || undefined, { auth: { token }, transports: ['websocket'] });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  socketToken = null;
}

export function getSocket(): Socket | null {
  return socket;
}
