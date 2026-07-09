const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'user-service', timestamp: new Date().toISOString() });
});

// Get all users
app.get('/users', (req, res) => {
  try {
    const users = [
      { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'admin' },
      { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'user' },
      { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', role: 'user' },
      { id: 4, name: 'Diana Prince', email: 'diana@example.com', role: 'moderator' }
    ];
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
});

// Get user by ID
app.get('/users/:id', (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }
    const users = [
      { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'admin' },
      { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'user' },
      { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', role: 'user' },
      { id: 4, name: 'Diana Prince', email: 'diana@example.com', role: 'moderator' }
    ];
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  res.status(500).json({ success: false, error: 'Something went wrong' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`User service running on port ${PORT}`);
});

module.exports = app;
