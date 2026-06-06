'use client';
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001';

let _socket: Socket | null = null;

function getSocket(token?: string): Socket {
  if (!_socket || !_socket.connected) {
    _socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
    });
  }
  return _socket;
}

export function useSocket(token?: string) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const s = getSocket(token);
    socketRef.current = s;
    return () => {
      // 연결 유지 (페이지 전환 시 재연결 불필요)
    };
  }, [token]);

  const joinStore = useCallback((storeId: string) => {
    socketRef.current?.emit('join:store', storeId);
    socketRef.current?.emit('join:kds',   storeId);
  }, []);

  const on = useCallback(<T>(event: string, handler: (data: T) => void) => {
    socketRef.current?.on(event, handler);
    return () => { socketRef.current?.off(event, handler); };
  }, []);

  return { socket: socketRef, joinStore, on };
}
