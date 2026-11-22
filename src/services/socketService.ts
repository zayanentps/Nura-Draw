import { CollaboratorUser } from '../types';

export type SocketEventCallback = (payload: any) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<SocketEventCallback>> = new Map();
  private reconnectTimer: any = null;
  private currentRoomId: string = 'design-room-1';
  private currentUser: CollaboratorUser = {
    id: 'user-' + Math.random().toString(36).substring(2, 9),
    name: 'Designer ' + Math.floor(100 + Math.random() * 900),
    color: ['#008080', '#e03e2d', '#2b78e4', '#a64d79', '#f39c12', '#27ae60', '#8e44ad'][
      Math.floor(Math.random() * 7)
    ],
  };
  private isConnecting: boolean = false;
  private isConnected: boolean = false;

  constructor() {
    // Generate or restore user profile
    const savedName = localStorage.getItem('nuradraw_user_name');
    const savedColor = localStorage.getItem('nuradraw_user_color');
    if (savedName) this.currentUser.name = savedName;
    if (savedColor) this.currentUser.color = savedColor;
  }

  public getCurrentUser(): CollaboratorUser {
    return { ...this.currentUser };
  }

  public updateUserName(name: string) {
    this.currentUser.name = name;
    localStorage.setItem('nuradraw_user_name', name);
    this.emitUserJoin();
  }

  public updateUserColor(color: string) {
    this.currentUser.color = color;
    localStorage.setItem('nuradraw_user_color', color);
    this.emitUserJoin();
  }

  public getRoomId(): string {
    return this.currentRoomId;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public connect(roomId: string = 'design-room-1') {
    this.currentRoomId = roomId;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.emitUserJoin();
      return;
    }

    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.emitUserJoin();
        this.trigger('connection:change', { connected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.trigger(message.type, message.payload);
        } catch (e) {
          console.error('Failed to parse websocket message', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.isConnecting = false;
        this.trigger('connection:change', { connected: false });
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket encountered error:', err);
      };
    } catch (e) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.currentRoomId);
    }, 3000);
  }

  private emitUserJoin() {
    this.send('join', {
      roomId: this.currentRoomId,
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      userColor: this.currentUser.color,
    });
  }

  public switchRoom(newRoomId: string) {
    this.currentRoomId = newRoomId;
    this.emitUserJoin();
  }

  public send(type: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  public sendCursor(x: number, y: number) {
    this.send('cursor:move', {
      cursor: { x, y },
    });
  }

  public sendCanvasUpdate(canvasData: any, action: string = 'sync', targetId?: string, objectData?: any) {
    this.send('canvas:update', {
      canvasData,
      action,
      targetId,
      objectData,
    });
  }

  public on(event: string, callback: SocketEventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  public off(event: string, callback: SocketEventCallback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private trigger(event: string, payload: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((cb) => {
        try {
          cb(payload);
        } catch (e) {
          console.error(`Error in listener for ${event}:`, e);
        }
      });
    }
  }

  public disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const socketService = new SocketService();
