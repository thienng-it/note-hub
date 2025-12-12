/**
 * useWebSocket Hook
 * React hook for managing WebSocket connections in components
 */

import { useCallback, useEffect, useState } from 'react';
import type {
  ConnectionStatus,
  NoteDeleted,
  NoteUpdate,
  UserJoined,
  UserLeft,
} from '../services/websocketClient';
import { websocketClient } from '../services/websocketClient';

interface UseWebSocketOptions {
  noteId?: number;
  onNoteUpdate?: (data: NoteUpdate) => void;
  onNoteDeleted?: (data: NoteDeleted) => void;
  onUserJoined?: (data: UserJoined) => void;
  onUserLeft?: (data: UserLeft) => void;
}

export function useWebSocket({
  noteId,
  onNoteUpdate,
  onNoteDeleted,
  onUserJoined,
  onUserLeft,
}: UseWebSocketOptions = {}) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [activeUsers, setActiveUsers] = useState<number[]>([]);

  // Initialize WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('notehub_access_token');
    if (!token) {
      return;
    }

    // Connect if not already connected
    if (!websocketClient.isConnected()) {
      websocketClient.connect(token);
    }

    // Subscribe to connection status
    const handleConnectionStatus = (status: ConnectionStatus) => {
      setConnectionStatus(status);
    };

    websocketClient.on('connection-status', handleConnectionStatus);

    // Initial status
    setConnectionStatus(websocketClient.getConnectionStatus());

    return () => {
      websocketClient.off('connection-status', handleConnectionStatus);
    };
  }, []);

  // Join/leave note room
  useEffect(() => {
    if (!noteId || !websocketClient.isConnected()) {
      return;
    }

    websocketClient.joinNote(noteId);

    return () => {
      websocketClient.leaveNote(noteId);
    };
  }, [noteId]);

  // Subscribe to note events
  useEffect(() => {
    if (!noteId) return;

    const handleNoteUpdate = (data: NoteUpdate) => {
      if (data.noteId === noteId && onNoteUpdate) {
        onNoteUpdate(data);
      }
    };

    const handleNoteDeleted = (data: NoteDeleted) => {
      if (data.noteId === noteId && onNoteDeleted) {
        onNoteDeleted(data);
      }
    };

    const handleUserJoined = (data: UserJoined) => {
      if (data.noteId === noteId) {
        if (onUserJoined) onUserJoined(data);
      }
    };

    const handleUserLeft = (data: UserLeft) => {
      if (data.noteId === noteId) {
        if (onUserLeft) onUserLeft(data);
      }
    };

    const handleRoomMembers = (data: { noteId: number; members: number[] }) => {
      if (data.noteId === noteId) {
        setActiveUsers(data.members);
      }
    };

    websocketClient.on('note-updated', handleNoteUpdate);
    websocketClient.on('note-deleted', handleNoteDeleted);
    websocketClient.on('user-joined', handleUserJoined);
    websocketClient.on('user-left', handleUserLeft);
    websocketClient.on('room-members', handleRoomMembers);

    return () => {
      websocketClient.off('note-updated', handleNoteUpdate);
      websocketClient.off('note-deleted', handleNoteDeleted);
      websocketClient.off('user-joined', handleUserJoined);
      websocketClient.off('user-left', handleUserLeft);
      websocketClient.off('room-members', handleRoomMembers);
    };
  }, [noteId, onNoteUpdate, onNoteDeleted, onUserJoined, onUserLeft]);

  // Send note update
  const sendUpdate = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: Flexible note changes structure
    (changes: any, version?: number) => {
      if (noteId) {
        websocketClient.sendNoteUpdate(noteId, changes, version);
      }
    },
    [noteId],
  );

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    activeUsers,
    sendUpdate,
  };
}
