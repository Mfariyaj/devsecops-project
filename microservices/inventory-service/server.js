const express = require('express');
const app = express();
const PORT = process.env.PORT || 3007;

app.use(express.json());

// In-memory inventory store
const inventory = [
  { id: 'SKU-001', name: 'Widget A', quantity: 150, warehouse: 'WH-1', lastUpdated: '2026-07-01T10:00:00Z' },
  { id: 'SKU-002', name: 'Widget B', quantity: 75, warehouse: 'WH-1', lastUpdated: '2026-07-02T14:30:00Z' },
  { id: 'SKU-003', name: 'Gadget X', quantity: 200, warehouse: 'WH-2', lastUpdated: '2026-07-03T09:15:00Z' },
  { id: 'SKU-004', name: 'Gadget Y', quantity: 0, warehouse: 'WH-2', lastUpdated: '2026-07-04T16:45:00Z' },
  { id: 'SKU-005', name: 'Component Z', quantity: 500, warehouse: 'WH-3', lastUpdated: '2026-07-05T11:20:00Z' }
];

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'inventory-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get all inventory / stock levels
app.get('/inventory', (req, res) => {
  try {
    const { warehouse, inStock } = req.query;
    let results = [...inventory];

    if (warehouse) {
      results = results.filter(item => item.warehouse === warehouse);
    }

    if (inStock === 'true') {
      results = results.filter(item => item.quantity > 0);
    }

    res.status(200).json({
      items: results,
      total: results.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Get inventory item by ID
app.get('/inventory/:id', (req, res) => {
  try {
    const item = inventory.find(i => i.id === req.params.id);

    if (!item) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Item ${req.params.id} not found in inventory`
      });
    }

    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Update stock level
app.put('/inventory/:id', (req, res) => {
  try {
    const { quantity } = req.body;
    const itemIndex = inventory.findIndex(i => i.id === req.params.id);

    if (itemIndex === -1) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Item ${req.params.id} not found in inventory`
      });
    }

    if (quantity === undefined || typeof quantity !== 'number') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'quantity field is required and must be a number'
      });
    }

    inventory[itemIndex].quantity = quantity;
    inventory[itemIndex].lastUpdated = new Date().toISOString();

    res.status(200).json({
      success: true,
      message: 'Stock level updated',
      item: inventory[itemIndex]
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
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
  console.log(`Inventory service running on port ${PORT}`);
});

module.exports = app;
