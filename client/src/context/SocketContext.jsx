import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [activeProgressMap, setActiveProgressMap] = useState({}); // { videoId: percentage }

  useEffect(() => {
    // In dev, connect to port 5000 directly or via proxy
    const socketInstance = io(window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Socket connected to server:', socketInstance.id);
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setConnected(false);
    });

    socketInstance.on('global-video-progress', (data) => {
      setActiveProgressMap((prev) => ({
        ...prev,
        [data.videoId]: data.progress,
      }));
    });

    socketInstance.on('global-video-status-changed', (data) => {
      if (data.status === 'READY' || data.status === 'FAILED') {
        setActiveProgressMap((prev) => {
          const next = { ...prev };
          delete next[data.videoId];
          return next;
        });
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, activeProgressMap }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
