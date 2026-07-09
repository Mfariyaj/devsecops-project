const express = require('express');
const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'cart-service', timestamp: new Date().toISOString() });
});

// Get cart items
app.get('/cart', (req, res) => {
  try {
    const cartItems = [
      { id: 1, productId: 1, name: 'Wireless Headphones', price: 79.99, quantity: 1 },
      { id: 2, productId: 4, name: 'Laptop Stand', price: 34.99, quantity: 2 },
      { id: 3, productId: 5, name: 'Yoga Mat', price: 24.99, quantity: 1 }
    ];
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    res.status(200).json({ success: true, count: cartItems.length, subtotal: Math.round(subtotal * 100) / 100, data: cartItems });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
});

// Add item to cart
app.post('/cart', (req, res) => {
  try {
    const { productId, name, price, quantity } = req.body;
    if (!productId || !name || !price) {
      return res.status(400).json({ success: false, error: 'productId, name, and price are required' });
    }
    const cartItem = {
      id: Date.now(),
      productId,
      name,
      price,
      quantity: quantity || 1,
      addedAt: new Date().toISOString()
    };
    res.status(201).json({ success: true, message: 'Item added to cart', data: cartItem });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
});

// Remove item from cart
app.delete('/cart/:id', (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    if (isNaN(itemId)) {
      return res.status(400).json({ success: false, error: 'Invalid item ID' });
    }
    res.status(200).json({ success: true, message: `Item ${itemId} removed from cart` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
});

// Clear cart
app.delete('/cart', (req, res) => {
  try {
    res.status(200).json({ success: true, message: 'Cart cleared successfully' });
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
  console.log(`Cart service running on port ${PORT}`);
});

module.exports = app;
