const express = require('express');
const app = express();
const PORT = process.env.PORT || 3006;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Send notification
app.post('/notify', (req, res) => {
  try {
    const { recipient, message, channel } = req.body;

    if (!recipient || !message) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'recipient and message fields are required'
      });
    }

    const notification = {
      id: `notif-${Date.now()}`,
      recipient,
      message,
      channel: channel || 'email',
      status: 'sent',
      sentAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      message: 'Notification sent successfully',
      notification
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Get notification history
app.get('/notifications', (req, res) => {
  res.status(200).json({
    notifications: [],
    total: 0,
    message: 'No notifications in history'
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`);
});

module.exports = app;
