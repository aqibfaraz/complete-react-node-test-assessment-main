const { v4: uuidv4 } = require('uuid');

// In-memory message storage
let messages = [];

class Message {
  // Initialize (no-op for in-memory storage)
  static async createTable() {
    console.log('Using in-memory message storage (no database required)');
    return Promise.resolve();
  }

  // Get all messages with pagination
  static async getAll(limit = 50, offset = 0) {
    try {
      // Sort by created_at descending, then reverse to show oldest first
      const sorted = [...messages].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      const paginated = sorted.slice(offset, offset + limit);
      return paginated.reverse(); // Reverse to show oldest first
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  // Search messages by term (newest first, max 100)
  static async search(term, limit = 100) {
    try {
      const lowerTerm = term.toLowerCase();
      const filtered = messages.filter(msg => 
        msg.message.toLowerCase().includes(lowerTerm) ||
        msg.username.toLowerCase().includes(lowerTerm)
      );
      
      // Sort by created_at descending (newest first)
      const sorted = filtered.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      
      return sorted.slice(0, limit);
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }

  // Create a new message
  static async create(username, message, imageUrl = null) {
    try {
      const newMessage = {
        id: uuidv4(),
        username,
        message: message || '',
        image_url: imageUrl,
        created_at: new Date().toISOString()
      };
      
      messages.push(newMessage);
      return newMessage;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  // Get message by ID
  static async getById(id) {
    try {
      return messages.find(msg => msg.id === id) || null;
    } catch (error) {
      console.error('Error fetching message by ID:', error);
      throw error;
    }
  }

  // Delete a message
  static async delete(id) {
    try {
      const index = messages.findIndex(msg => msg.id === id);
      if (index === -1) {
        return null;
      }
      
      const deleted = messages.splice(index, 1)[0];
      return { id: deleted.id };
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }
}

module.exports = Message;
