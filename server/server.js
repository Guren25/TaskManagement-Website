require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const taskRoutes = require('./routes/TaskRoutes');
const userRoutes = require('./routes/UserRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const app = express();
const cron = require('node-cron');
const TaskController = require('./controllers/TaskController');
const http = require('http');
const socketIo = require('socket.io');

// Configure CORS to allow requests from the frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', '*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }
};

connectDB();

app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/activity-logs', activityLogRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});

// Add a socket test route
app.get("/socket-test", (req, res) => {
  const io = req.app.get('io');
  if (io) {
    io.emit('test', { message: 'Test message from server', timestamp: new Date().toISOString() });
    console.log('Test event emitted to all clients');
    res.json({ success: true, message: 'Test event emitted to all clients' });
  } else {
    console.error('No socket instance found on app');
    res.status(500).json({ success: false, message: 'Socket instance not available' });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!", error: err.message });
});

const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;


//first login admin/manager
cron.schedule('0 9 * * *', async () => {
  console.log('Running daily due date check...');
  try {
    await TaskController.checkDueDates();
  } catch (error) {
    console.error('Error in cron job:', error);
  }
});

//ONLY USE FOR TESTING IN DEVELOPMENT MODE
/*if (isDevelopment) {
  console.log('Development mode: Setting up test due date checks');
  // Check every hour in development
  cron.schedule('* * * * *', async () => {
    console.log('Running development due date check...');
    try {
      await TaskController.checkDueDates();
    } catch (error) {
      console.error('Error in development cron job:', error);
    }
  });
}*/

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Socket.io setup with increased timeout and better CORS settings
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', '*'],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Authorization", "X-Requested-With", "Content-Type"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 60000
});

// Socket authentication middleware with better error handling
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    console.log('Socket authentication failed: No token provided');
    return next(new Error('Authentication error: No token provided'));
  }
  // For now we're just checking if token exists
  console.log('Socket authenticated with token');
  next();
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle ping for connection testing
  socket.on('ping', (data) => {
    console.log(`Received ping from client ${socket.id}:`, data);
    socket.emit('pong', { 
      ...data,
      serverTime: new Date().toISOString(),
      message: 'Connection working properly'
    });
  });

  socket.on('join', (roomId) => {
    socket.join(roomId);
    console.log(`Client ${socket.id} joined room: ${roomId}`);
  });

  socket.on('leave', (roomId) => {
    socket.leave(roomId);
    console.log(`Client ${socket.id} left room: ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  // Send connection success event after 1 second
  setTimeout(() => {
    socket.emit('connection_status', { 
      status: 'connected',
      socketId: socket.id,
      serverTime: new Date().toISOString()
    });
  }, 1000);
});

// Make io available to other parts of the application
app.set('io', io);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
