import React, { createContext, useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    let socketInstance = null;

    if (user) {
      const token = localStorage.getItem('token');
      
      // Initialize Socket connection through the API Gateway
      socketInstance = io(API_URL, {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      socketInstance.on('connect', () => {
        console.log('✅ Connected to Chat Socket through API Gateway');
      });

      socketInstance.on('connect_error', (err) => {
        console.error('❌ Socket connection error:', err.message);
      });

      setSocket(socketInstance);
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }

    // Cleanup connection on unmount / user change
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
