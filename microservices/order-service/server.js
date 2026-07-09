const express = require('express');
const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'order-service', timestamp: new Date().toISOString() });
});

// Get all orders
app.get('/orders', (req, res) => {
  try {
    const orders = [
      { id: 'ORD-001', userId: 1, items: [{ productId: 1, quantity: 2 }], total: 159.98, status: 'delivered', createdAt: '2026-07-01T10:00:00Z' },
      { id: 'ORD-002', userId: 2, items: [{ productId: 3, quantity: 1 }], total: 49.99, status: 'processing', createdAt: '2026-07-05T14:30:00Z' },
      { id: 'ORD-003', userId: 1, items: [{ productId: 2, quantity: 1 }, { productId: 5, quantity: 1 }], total: 154.98, status: 'shipped', createdAt: '2026-07-06T09:15:00Z' },
      { id: 'ORD-004', userId: 3, items: [{ productId: 4, quantity: 3 }], total: 104.97, status: 'pending', createdAt: '2026-07-07T16:45:00Z' }
    ];
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
});

// Get order by ID
app.get('/orders/:id', (req, res) => {
  try {
    const orderId = req.params.id;
    const orders = [
      { id: 'ORD-001', userId: 1, items: [{ productId: 1, quantity: 2 }], total: 159.98, status: 'delivered', createdAt: '2026-07-01T10:00:00Z' },
      { id: 'ORD-002', userId: 2, items: [{ productId: 3, quantity: 1 }], total: 49.99, status: 'processing', createdAt: '2026-07-05T14:30:00Z' }
    ];
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
});

// Create a new order
app.post('/orders', (req, res) => {
  try {
    const { userId, items } = req.body;
    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'userId and items array are required' });
    }
    const newOrder = {
      id: `ORD-${Date.now()}`,
      userId,
      items,
      total: items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0),
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    res.status(201).json({ success: true, message: 'Order created successfully', data: newOrder });
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
  console.log(`Order service running on port ${PORT}`);
});

module.exports = app;
