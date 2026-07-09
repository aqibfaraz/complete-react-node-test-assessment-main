import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Pusher from 'pusher-js';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const PUSHER_KEY = process.env.REACT_APP_PUSHER_KEY;
const PUSHER_CLUSTER = process.env.REACT_APP_PUSHER_CLUSTER;
const PUSHER_CHANNEL = process.env.REACT_APP_PUSHER_CHANNEL || 'chat-messages';

const isRealEnvValue = (value) => {
  if (!value) {
    return false;
  }

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return !(
    normalized === 'your_pusher_key' ||
    normalized === 'your_pusher_cluster' ||
    normalized === 'changeme' ||
    normalized === 'placeholder'
  );
};

const mergeMessage = (previousMessages, incomingMessage) => {
  if (previousMessages.some((msg) => msg.id === incomingMessage.id)) {
    return previousMessages;
  }

  return [...previousMessages, incomingMessage].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );
};

function App() {
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState('');
  const [messageText, setMessageText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const searchTermRef = useRef('');
  const isSearchingRef = useRef(false);
  const isSearching = searchTerm.trim().length > 0;
  const visibleMessages = isSearching ? searchResults : messages;

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    searchTermRef.current = searchTerm;
    isSearchingRef.current = isSearching;
  }, [searchTerm, isSearching]);

  useEffect(() => {
    const canUseRealtime = isRealEnvValue(PUSHER_KEY) && isRealEnvValue(PUSHER_CLUSTER);
    if (!canUseRealtime) {
      return undefined;
    }

    let pusher;
    let channel;

    try {
      pusher = new Pusher(PUSHER_KEY, {
        cluster: PUSHER_CLUSTER,
        // Avoid fallback transport path that can fail in some browser/worker environments.
        enabledTransports: ['ws', 'wss'],
        disabledTransports: ['sockjs'],
      });

      pusher.connection.bind('connected', () => {
        console.log('✅ Connected to Pusher');
      });

      pusher.connection.bind('error', (err) => {
        console.log('❌ Pusher Error', err);
      });

      channel = pusher.subscribe(PUSHER_CHANNEL);
      channel.bind('pusher:subscription_succeeded', () => {
        console.log('✅ Subscribed to channel', PUSHER_CHANNEL);
      });
      channel.bind('pusher:subscription_error', (status) => {
        console.log('❌ Subscription error', status);
      });
    } catch (err) {
      console.error('Pusher initialization failed. Realtime updates are disabled.', err);
      return undefined;
    }

    const onNewMessage = (newMessage) => {
      console.log('Received:', newMessage);
      setMessages((prev) => mergeMessage(prev, newMessage));

      if (isSearchingRef.current) {
        setSearchResults((prev) => {
          const messageBody = (newMessage.message || '').toLowerCase();
          const usernameText = (newMessage.username || '').toLowerCase();
          const term = searchTermRef.current.trim().toLowerCase();

          if (!term || (!messageBody.includes(term) && !usernameText.includes(term))) {
            return prev;
          }

          if (prev.some((msg) => msg.id === newMessage.id)) {
            return prev;
          }

          return [newMessage, ...prev].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          );
        });
      }
    };

    const onMessageDeleted = (payload) => {
      const deletedId = payload?.id;
      if (!deletedId) {
        return;
      }

      setMessages((prev) => prev.filter((msg) => msg.id !== deletedId));
      setSearchResults((prev) => prev.filter((msg) => msg.id !== deletedId));
    };

    channel.bind('new-message', onNewMessage);
    channel.bind('message-deleted', onMessageDeleted);

    return () => {
      channel.unbind('new-message', onNewMessage);
      channel.unbind('message-deleted', onMessageDeleted);
      pusher.unsubscribe(PUSHER_CHANNEL);
      pusher.disconnect();
    };
  }, []);

  useEffect(() => {
    const trimmedQuery = searchTerm.trim();

    if (!trimmedQuery) {
      setSearchResults([]);
      setSearchLoading(false);
      return undefined;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setSearchLoading(true);
        setError('');

        const response = await axios.get(`${API_BASE_URL}/api/messages/search`, {
          params: { q: trimmedQuery },
        });

        setSearchResults(response.data.messages || []);
      } catch (err) {
        setSearchResults([]);
        setError(err.response?.data?.error || 'Failed to search messages');
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [visibleMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_BASE_URL}/api/messages`);
      setMessages(response.data.messages || []);
    } catch (err) {
      setError('Failed to load messages');
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      setSelectedImage(file);
      setError('');

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }

    if (!messageText.trim() && !selectedImage) {
      setError('Please enter a message or select an image');
      return;
    }

    try {
      setLoading(true);
      setError('');

      let createdMessage = null;

      if (selectedImage) {
        const formData = new FormData();
        formData.append('username', username.trim());
        formData.append('message', messageText.trim());
        formData.append('image', selectedImage);

        const response = await axios.post(`${API_BASE_URL}/api/messages/with-image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        createdMessage = response.data?.message;
        removeImage();
      } else {
        const response = await axios.post(`${API_BASE_URL}/api/messages`, {
          username: username.trim(),
          message: messageText.trim(),
        });
        createdMessage = response.data?.message;
      }

      setMessageText('');

      // Refresh messages to show the new one
      if (createdMessage) {
        setMessages((prev) => mergeMessage(prev, createdMessage));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message');
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/messages/${messageId}`);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete message');
      console.error('Error deleting message:', err);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>💬 Chat App</h1>
        <p>Send messages and share images</p>
      </header>

      <main className="chat-container">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by message or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="search-status">
            {searchLoading
              ? 'Searching...'
              : isSearching
                ? `${searchResults.length} result(s)`
                : 'Live feed'}
          </span>
        </div>

        <div className="chat-messages" id="messages-container">
          {loading && visibleMessages.length === 0 && !isSearching ? (
            <div className="loading">Loading messages...</div>
          ) : searchLoading ? (
            <div className="loading">Searching messages...</div>
          ) : visibleMessages.length === 0 ? (
            <div className="no-messages">
              {isSearching
                ? 'No messages match your search.'
                : 'No messages yet. Start the conversation!'}
            </div>
          ) : (
            visibleMessages.map((msg) => (
              <div key={msg.id} className="message-item">
                <div className="message-header">
                  <span className="message-username">{msg.username}</span>
                  <span className="message-time">{formatTime(msg.created_at)}</span>
                </div>
                {msg.image_url && (
                  <div className="message-image">
                    <img 
                      src={`${API_BASE_URL}${msg.image_url}`} 
                      alt="Shared" 
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                {msg.message && (
                  <div className="message-text">{msg.message}</div>
                )}
                <button
                  className="delete-message-btn"
                  onClick={() => handleDeleteMessage(msg.id)}
                  title="Delete message"
                >
                  ×
                </button>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={handleSendMessage}>
          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="input-group">
            <input
              type="text"
              placeholder="Your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="username-input"
              disabled={loading}
            />
          </div>

          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Preview" />
              <button type="button" onClick={removeImage} className="remove-image-btn">
                Remove
              </button>
            </div>
          )}

          <div className="input-group">
            <input
              type="text"
              placeholder="Type your message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="message-input"
              disabled={loading}
            />
            <label className="image-upload-label">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                disabled={loading}
                style={{ display: 'none' }}
              />
              📷
            </label>
          </div>

          <button
            type="submit"
            className="send-button"
            disabled={loading || (!messageText.trim() && !selectedImage)}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default App;
