import { useState, useEffect, useRef } from 'react';
import { socketService } from '../services/socketService';
import { useAuth } from '../context/AuthContext';

export function useSocket() {
  const { user, isLoggedIn } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn || !user) return;

    async function initSocket() {
      const sock = await socketService.connect();
      socketRef.current = sock;

      if (sock.connected) {
        setIsConnected(true);
        // ✅ Rejoindre room userId pour recevoir notifications ciblées
        socketService.joinUserRoom(user._id);
        socketService.joinWilaya(user._id, user.wilaya);
      }

      sock.on('connect', () => {
        setIsConnected(true);
        // ✅ Re-rejoindre après reconnexion
        socketService.joinUserRoom(user._id);
        socketService.joinWilaya(user._id, user.wilaya);
      });

      sock.on('disconnect', () => setIsConnected(false));
    }

    initSocket();

    return () => {
      socketService.disconnect();
      setIsConnected(false);
    };
  }, [isLoggedIn, user]);

  return { socket: socketRef.current, isConnected };
}