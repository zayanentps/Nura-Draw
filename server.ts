import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = parseInt(process.env.PORT || '3000', 10);
const isDev = process.env.NODE_ENV !== 'production';

// Room state storage for real-time collaboration
interface UserSession {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  ws: WebSocket;
  roomId: string;
}

interface RoomData {
  canvasData: any | null;
  users: Map<string, UserSession>;
  updatedAt: number;
}

const rooms = new Map<string, RoomData>();

function getOrCreateRoom(roomId: string): RoomData {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      canvasData: null,
      users: new Map(),
      updatedAt: Date.now(),
    });
  }
  return rooms.get(roomId)!;
}

wss.on('connection', (ws: WebSocket) => {
  let currentUser: UserSession | null = null;

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      const { type, payload } = data;

      switch (type) {
        case 'join': {
          const { roomId = 'default-room', userId, userName, userColor } = payload;
          const room = getOrCreateRoom(roomId);

          currentUser = {
            id: userId,
            name: userName || `Designer ${Math.floor(Math.random() * 1000)}`,
            color: userColor || '#00a86b',
            ws,
            roomId,
          };
          room.users.set(userId, currentUser);

          // 1. Send initial room state to the newly joined client
          const userList = Array.from(room.users.values()).map(u => ({
            id: u.id,
            name: u.name,
            color: u.color,
            cursor: u.cursor,
          }));

          ws.send(JSON.stringify({
            type: 'room:init',
            payload: {
              roomId,
              canvasData: room.canvasData,
              users: userList,
            },
          }));

          // 2. Broadcast user-joined to all other users in this room
          broadcastToRoom(roomId, ws, {
            type: 'user:joined',
            payload: {
              user: {
                id: currentUser.id,
                name: currentUser.name,
                color: currentUser.color,
              },
            },
          });
          break;
        }

        case 'cursor:move': {
          if (!currentUser) return;
          const room = rooms.get(currentUser.roomId);
          if (!room) return;
          currentUser.cursor = payload.cursor;

          broadcastToRoom(currentUser.roomId, ws, {
            type: 'cursor:updated',
            payload: {
              userId: currentUser.id,
              cursor: payload.cursor,
            },
          });
          break;
        }

        case 'canvas:update': {
          if (!currentUser) return;
          const room = rooms.get(currentUser.roomId);
          if (!room) return;

          // Store latest canvas JSON state
          room.canvasData = payload.canvasData;
          room.updatedAt = Date.now();

          // Broadcast delta or sync to all peers in the room
          broadcastToRoom(currentUser.roomId, ws, {
            type: 'canvas:updated',
            payload: {
              senderId: currentUser.id,
              action: payload.action || 'sync',
              targetId: payload.targetId,
              objectData: payload.objectData,
              canvasData: payload.canvasData,
            },
          });
          break;
        }

        case 'canvas:event': {
          if (!currentUser) return;
          broadcastToRoom(currentUser.roomId, ws, {
            type: 'canvas:event',
            payload: {
              senderId: currentUser.id,
              eventType: payload.eventType,
              data: payload.data,
            },
          });
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    if (currentUser) {
      const room = rooms.get(currentUser.roomId);
      if (room) {
        room.users.delete(currentUser.id);
        broadcastToRoom(currentUser.roomId, null, {
          type: 'user:left',
          payload: { userId: currentUser.id },
        });

        if (room.users.size === 0) {
          // Keep canvas data alive for 1 hour even if empty
        }
      }
    }
  });
});

function broadcastToRoom(roomId: string, senderWs: WebSocket | null, messageObj: any) {
  const room = rooms.get(roomId);
  if (!room) return;
  const msgString = JSON.stringify(messageObj);

  for (const client of room.users.values()) {
    if (client.ws !== senderWs && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(msgString);
    }
  }
}

// REST endpoints
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeRooms: rooms.size,
  });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  return res.json({
    roomId: req.params.roomId,
    userCount: room.users.size,
    hasCanvas: !!room.canvasData,
    updatedAt: room.updatedAt,
  });
});

async function startServer() {
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CorelDraw Web server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
