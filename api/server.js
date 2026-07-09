const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });

const messageRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/messages', messageRoutes);

// Initialize in-memory storage on startup
async function initializeStorage() {
  try {
    const Message = require('./models/Message');
    await Message.createTable();
    console.log('In-memory storage initialized successfully');
  } catch (error) {
    console.error('Failed to initialize storage:', error);
    process.exit(1);
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      success: false,
      error: 'File too large. Maximum size is 5MB' 
    });
  }

  res.status(500).json({ 
    success: false,
    error: err.message || 'Internal server error' 
  });
});

// Start server
async function startServer() {
  await initializeStorage();
  
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(
      process.env.PUSHER_APP_ID &&
        process.env.PUSHER_KEY &&
        process.env.PUSHER_SECRET &&
        process.env.PUSHER_CLUSTER
        ? 'Pusher realtime publishing is enabled'
        : 'Pusher credentials missing, realtime publishing is disabled'
    );
    console.log('Note: Messages are stored in-memory and will be lost on server restart');
  });
}

startServer();
