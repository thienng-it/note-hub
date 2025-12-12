/**
 * WebSocket Client Service
 * Handles real-time communication with the server using Socket.IO
 */

import { io, type Socket } from 'socket.io-client';

interface NoteUpdate {
  noteId: number;
  changes: {
    title?: string;
    body?: string;
    pinned?: boolean;
    favorite?: boolean;
    archived?: boolean;
    tags?: Array<{ id: number; name: string; color: string }>;
    images?: string[];
  };
  version?: number;
  updatedBy: {
    userId: number;
    username: string;
  };
  timestamp: string;
}

interface UserJoined {
  userId: number;
  username: string;
  noteId: number;
  timestamp: string;
}

interface UserLeft {
  userId: number;
  username: string;
  noteId: number;
  timestamp: string;
}

interface RoomMembers {
  noteId: number;
  members: number[];
  count: number;
}

interface NoteDeleted {
  noteId: number;
  deletedBy: {
    userId: number;
    username: string;
  };
  timestamp: string;
}

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// biome-ignore lint/suspicious/noExplicitAny: Generic event callback
type EventCallback = (data?: any) => void;

class WebSocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private maxReconnectAttempts = 5;

  /**
   * Initialize WebSocket connection
   */
  connect(token: string): void {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || '';

    this.socket = io(apiUrl, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventListeners();
  }

  /**
   * Set up Socket.IO event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.connectionStatus = 'connected';
      this.emit('connection-status', 'connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.connectionStatus = 'disconnected';
      this.emit('connection-status', 'disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.connectionStatus = 'error';
      this.emit('connection-status', 'error');
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      this.connectionStatus = 'connected';
      this.emit('connection-status', 'connected');
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('WebSocket reconnection attempt:', attemptNumber);
      this.connectionStatus = 'connecting';
      this.emit('connection-status', 'connecting');
    });

    // Note collaboration events
    this.socket.on('note-updated', (data: NoteUpdate) => {
      console.log('Note updated:', data);
      this.emit('note-updated', data);
    });

    this.socket.on('note-deleted', (data: NoteDeleted) => {
      console.log('Note deleted:', data);
      this.emit('note-deleted', data);
    });

    this.socket.on('user-joined', (data: UserJoined) => {
      console.log('User joined:', data);
      this.emit('user-joined', data);
    });

    this.socket.on('user-left', (data: UserLeft) => {
      console.log('User left:', data);
      this.emit('user-left', data);
    });

    this.socket.on('room-members', (data: RoomMembers) => {
      console.log('Room members:', data);
      this.emit('room-members', data);
    });

    this.socket.on('cursor-update', (data) => {
      this.emit('cursor-update', data);
    });

    this.socket.on('connected', (data) => {
      console.log('Connection confirmed:', data);
      this.emit('connected', data);
    });

    // Folder events
    this.socket.on('folder-created', (data) => {
      console.log('Folder created:', data);
      this.emit('folder-created', data);
    });

    this.socket.on('folder-updated', (data) => {
      console.log('Folder updated:', data);
      this.emit('folder-updated', data);
    });

    this.socket.on('folder-deleted', (data) => {
      console.log('Folder deleted:', data);
      this.emit('folder-deleted', data);
    });
  }

  /**
   * Join a note room for real-time updates
   */
  joinNote(noteId: number): void {
    if (!this.socket?.connected) {
      console.warn('Cannot join note: WebSocket not connected');
      return;
    }

    console.log('Joining note room:', noteId);
    this.socket.emit('join-note', noteId);
  }

  /**
   * Leave a note room
   */
  leaveNote(noteId: number): void {
    if (!this.socket?.connected) {
      return;
    }

    console.log('Leaving note room:', noteId);
    this.socket.emit('leave-note', noteId);
  }

  /**
   * Send note update to other users
   */
  // biome-ignore lint/suspicious/noExplicitAny: Flexible note changes structure
  sendNoteUpdate(noteId: number, changes: any, version?: number): void {
    if (!this.socket?.connected) {
      console.warn('Cannot send update: WebSocket not connected');
      return;
    }

    this.socket.emit('note-update', {
      noteId,
      changes,
      version,
    });
  }

  /**
   * Send cursor position for collaborative editing
   */
  sendCursorPosition(
    noteId: number,
    position: number,
    selection?: { start: number; end: number },
  ): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('cursor-position', {
      noteId,
      position,
      selection,
    });
  }

  /**
   * Subscribe to an event
   */
  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Emit event to local listeners
   */
  // biome-ignore lint/suspicious/noExplicitAny: Generic event data
  private emit(event: string, data?: any): void {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatus = 'disconnected';
      this.listeners.clear();
      console.log('WebSocket disconnected');
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const websocketClient = new WebSocketClient();

// Export types
export type { NoteUpdate, UserJoined, UserLeft, RoomMembers, NoteDeleted, ConnectionStatus };
