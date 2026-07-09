const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const upload = require('../middleware/upload');
const path = require('path');
const Pusher = require('pusher');

const PUSHER_CHANNEL = process.env.PUSHER_CHANNEL || 'chat-messages';

const pusherConfigured =
  process.env.PUSHER_APP_ID &&
  process.env.PUSHER_KEY &&
  process.env.PUSHER_SECRET &&
  process.env.PUSHER_CLUSTER;

const pusher = pusherConfigured
  ? new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
      useTLS: true,
    })
  : null;

async function publishEvent(eventName, payload) {
  if (!pusher) {
    return;
  }

  try {
    console.log('Publishing:', eventName, payload);
    await pusher.trigger(PUSHER_CHANNEL, eventName, payload);
    console.log('✅ Event sent:', eventName);
  } catch (error) {
    console.error(`Failed to publish Pusher event ${eventName}:`, error);
  }
}

// Get all messages
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    
    const messages = await Message.getAll(limit, offset);
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// Search messages (case-insensitive, newest first, max 100)
router.get('/search', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter q is required and cannot be empty',
      });
    }

    const messages = await Message.search(q, 100);
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ success: false, error: 'Failed to search messages' });
  }
});

// Create a new text message
router.post('/', async (req, res) => {
  try {
    const { username, message } = req.body;

    if (!username || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and message are required' 
      });
    }

    if (message.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message cannot be empty' 
      });
    }

    const newMessage = await Message.create(username, message.trim());

    await publishEvent('new-message', newMessage);

    res.status(201).json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ success: false, error: 'Failed to create message' });
  }
});

// Create a message with image
router.post('/with-image', upload.single('image'), async (req, res) => {
  try {
    const { username, message } = req.body;

    if (!username) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username is required' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'Image file is required' 
      });
    }

    // Construct image URL (in production, this would be a CDN URL)
    const imageUrl = `/uploads/${req.file.filename}`;
    const messageText = message ? message.trim() : '';

    const newMessage = await Message.create(username, messageText, imageUrl);

    await publishEvent('new-message', newMessage);

    res.status(201).json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error creating message with image:', error);
    
    // Clean up uploaded file if message creation failed
    if (req.file) {
      const fs = require('fs');
      const filePath = path.join(__dirname, '../uploads', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create message with image' 
    });
  }
});

// Get a single message by ID
router.get('/:id', async (req, res) => {
  try {
    const message = await Message.getById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ 
        success: false, 
        error: 'Message not found' 
      });
    }

    res.json({ success: true, message });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch message' });
  }
});

// Delete a message
router.delete('/:id', async (req, res) => {
  try {
    const deletedMessage = await Message.delete(req.params.id);
    
    if (!deletedMessage) {
      return res.status(404).json({ 
        success: false, 
        error: 'Message not found' 
      });
    }

    await publishEvent('message-deleted', { id: deletedMessage.id });

    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
});

module.exports = router;

