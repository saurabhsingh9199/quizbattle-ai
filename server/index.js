const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');
const roomRoutes = require('./routes/room');
const tutorRoutes = require('./routes/tutor');
const { setupSocketHandlers } = require('./socket/socketHandlers');

const isDev = process.env.NODE_ENV !== 'production';

/** Allow localhost + private LAN IPs on port 3000 during development. */
const LAN_DEV_ORIGIN_REGEX =
  /^http:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[01])\.\d{1,3}\.\d{1,3}):3000$/;

const getAllowedOrigins = () => {
  const origins = [process.env.CLIENT_URL || 'http://localhost:3000'];
  if (process.env.CLIENT_URLS) {
    origins.push(
      ...process.env.CLIENT_URLS.split(',').map((s) => s.trim()).filter(Boolean)
    );
  }
  return [...new Set(origins)];
};

const corsOriginChecker = (origin, callback) => {
  const allowed = getAllowedOrigins();
  if (!origin) return callback(null, true);
  if (allowed.includes(origin)) return callback(null, true);
  if (isDev && LAN_DEV_ORIGIN_REGEX.test(origin)) return callback(null, true);
  return callback(new Error(`CORS blocked origin: ${origin}`));
};

const corsOptions = {
  origin: corsOriginChecker,
  credentials: true,
};

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    ...corsOptions,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/tutor', tutorRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Quiz Battle Server Running!' });
});

// Socket.IO setup
setupSocketHandlers(io);

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quizbattle');
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

const PORT = process.env.PORT || 5000;

const getLanAddresses = () => Object.values(require('os').networkInterfaces()).flat().filter(Boolean).filter(i => i.family === 'IPv4' && !i.internal).map(i => i.address);

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Stop the other process or change PORT in .env.`);
    process.exit(1);
  }

  console.error('❌ Server startup error:', error.message);
  process.exit(1);
});

connectDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT} (LAN accessible)`);
    const lan = getLanAddresses();
    lan.forEach(ip => console.log(`🌐 LAN client: http://${ip}:3000`));
    console.log(`🔌 Socket.IO ready`);
  });
});

module.exports = { io };
