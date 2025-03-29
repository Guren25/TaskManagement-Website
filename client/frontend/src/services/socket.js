import { io } from 'socket.io-client';

let socket;

export const initializeSocket = (token) => {
  // Close any existing socket connection
  if (socket) {
    console.log('Disconnecting existing socket connection');
    socket.disconnect();
  }

  // Create a new socket connection with auth token - use explicit port 5000 to avoid Vite dev server
  const backendUrl = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : window.location.origin;
  
  console.log('Initializing socket connection to:', backendUrl);
  
  socket = io(backendUrl, {
    auth: {
      token
    },
    transports: ['websocket', 'polling'], // Try both transport methods
    withCredentials: true,
    timeout: 60000,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    path: '/socket.io/' // Ensure correct path
  });

  socket.on('connect', () => {
    console.log('Socket connected successfully to', backendUrl, 'with ID:', socket.id);
    // Send test ping to verify connection is working
    socket.emit('ping', { clientTime: new Date().toISOString() });
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
    console.log('Connection details:', {
      url: backendUrl,
      transport: socket?.io?.engine?.transport?.name || 'unknown',
      protocol: window.location.protocol
    });
  });

  // Add test event listener
  socket.on('test', (data) => {
    console.log('Received test event from server:', data);
  });

  // Add ping response
  socket.on('pong', (data) => {
    console.log('Received pong from server:', data);
    const roundtripTime = new Date() - new Date(data.clientTime);
    console.log(`Socket round-trip time: ${roundtripTime}ms`);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(`Socket reconnected after ${attemptNumber} attempts`);
  });

  socket.on('reconnect_error', (error) => {
    console.error('Socket reconnection error:', error.message);
  });

  socket.on('reconnect_failed', () => {
    console.error('Socket reconnection failed after max attempts');
    // Fallback to polling if websocket fails
    if (socket?.io?.engine?.transport?.name === 'websocket') {
      console.log('Falling back to polling transport');
      socket.io.engine.transport.name = 'polling';
    }
  });

  return socket;
};

// Add a function to manually test the connection
export const testSocketConnection = () => {
  const socket = getSocket();
  if (socket) {
    console.log('Testing socket connection, current state:', socket.connected ? 'connected' : 'disconnected');
    
    if (socket.connected) {
      socket.emit('ping', { clientTime: new Date().toISOString() });
      return true;
    } else {
      console.log('Socket not connected, attempting to reconnect...');
      socket.connect();
      return false;
    }
  } else {
    console.log('No socket instance available');
    return false;
  }
};

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('token');
    if (token) {
      return initializeSocket(token);
    }
  }
  return socket;
};

export const joinRoom = (roomId) => {
  const socket = getSocket();
  if (socket) {
    socket.emit('join', roomId);
  }
};

export const leaveRoom = (roomId) => {
  const socket = getSocket();
  if (socket) {
    socket.emit('leave', roomId);
  }
};

export const subscribeToTaskUpdates = (callback) => {
  const socket = getSocket();
  if (socket) {
    socket.on('taskCreated', (data) => {
      callback('created', data);
    });
    
    socket.on('taskUpdated', (data) => {
      callback('updated', data);
    });
    
    socket.on('taskDeleted', (data) => {
      callback('deleted', data);
    });
  }
};

export const unsubscribeFromTaskUpdates = () => {
  const socket = getSocket();
  if (socket) {
    socket.off('taskCreated');
    socket.off('taskUpdated');
    socket.off('taskDeleted');
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default {
  initializeSocket,
  getSocket,
  joinRoom,
  leaveRoom,
  subscribeToTaskUpdates,
  unsubscribeFromTaskUpdates,
  disconnectSocket,
  testSocketConnection
}; 