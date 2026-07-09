const express = require('express');
const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'product-service', timestamp: new Date().toISOString() });
});

// Get all products
app.get('/products', (req, res) => {
  try {
    const products = [
      { id: 1, name: 'Wireless Headphones', price: 79.99, category: 'Electronics', inStock: true },
      { id: 2, name: 'Running Shoes', price: 129.99, category: 'Sports', inStock: true },
      { id: 3, name: 'Coffee Maker', price: 49.99, category: 'Kitchen', inStock: false },
      { id: 4, name: 'Laptop Stand', price: 34.99, category: 'Office', inStock: true },
      { id: 5, name: 'Yoga Mat', price: 24.99, category: 'Sports', inStock: true }
    ];
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
});

// Get product by ID
app.get('/products/:id', (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({ success: false, error: 'Invalid product ID' });
    }
    const products = [
      { id: 1, name: 'Wireless Headphones', price: 79.99, category: 'Electronics', inStock: true },
      { id: 2, name: 'Running Shoes', price: 129.99, category: 'Sports', inStock: true },
      { id: 3, name: 'Coffee Maker', price: 49.99, category: 'Kitchen', inStock: false },
      { id: 4, name: 'Laptop Stand', price: 34.99, category: 'Office', inStock: true },
      { id: 5, name: 'Yoga Mat', price: 24.99, category: 'Sports', inStock: true }
    ];
    const product = products.find(p => p.id === productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.status(200).json({ success: true, data: product });
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
  console.log(`Product service running on port ${PORT}`);
});

module.exports = app;
