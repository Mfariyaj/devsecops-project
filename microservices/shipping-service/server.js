const express = require('express');
const app = express();
const PORT = process.env.PORT || 3008;

app.use(express.json());

// In-memory shipments store
const shipments = [
  { id: 'SHIP-001', orderId: 'ORD-101', status: 'delivered', carrier: 'FedEx', trackingNumber: 'FX123456789', createdAt: '2026-07-01T08:00:00Z', deliveredAt: '2026-07-03T14:30:00Z' },
  { id: 'SHIP-002', orderId: 'ORD-102', status: 'in_transit', carrier: 'UPS', trackingNumber: 'UP987654321', createdAt: '2026-07-05T10:00:00Z', deliveredAt: null },
  { id: 'SHIP-003', orderId: 'ORD-103', status: 'processing', carrier: 'DHL', trackingNumber: null, createdAt: '2026-07-07T16:00:00Z', deliveredAt: null }
];

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'shipping-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get all shipments
app.get('/shipments', (req, res) => {
  try {
    const { status, carrier } = req.query;
    let results = [...shipments];

    if (status) {
      results = results.filter(s => s.status === status);
    }

    if (carrier) {
      results = results.filter(s => s.carrier.toLowerCase() === carrier.toLowerCase());
    }

    res.status(200).json({
      shipments: results,
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

// Get shipment by ID
app.get('/shipments/:id', (req, res) => {
  try {
    const shipment = shipments.find(s => s.id === req.params.id);

    if (!shipment) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Shipment ${req.params.id} not found`
      });
    }

    res.status(200).json(shipment);
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Create a new shipment
app.post('/shipments', (req, res) => {
  try {
    const { orderId, carrier } = req.body;

    if (!orderId || !carrier) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'orderId and carrier fields are required'
      });
    }

    const newShipment = {
      id: `SHIP-${String(shipments.length + 1).padStart(3, '0')}`,
      orderId,
      status: 'processing',
      carrier,
      trackingNumber: null,
      createdAt: new Date().toISOString(),
      deliveredAt: null
    };

    shipments.push(newShipment);

    res.status(201).json({
      success: true,
      message: 'Shipment created successfully',
      shipment: newShipment
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Update shipment status
app.patch('/shipments/:id', (req, res) => {
  try {
    const { status, trackingNumber } = req.body;
    const shipmentIndex = shipments.findIndex(s => s.id === req.params.id);

    if (shipmentIndex === -1) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Shipment ${req.params.id} not found`
      });
    }

    if (status) {
      shipments[shipmentIndex].status = status;
      if (status === 'delivered') {
        shipments[shipmentIndex].deliveredAt = new Date().toISOString();
      }
    }

    if (trackingNumber) {
      shipments[shipmentIndex].trackingNumber = trackingNumber;
    }

    res.status(200).json({
      success: true,
      message: 'Shipment updated',
      shipment: shipments[shipmentIndex]
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
  console.log(`Shipping service running on port ${PORT}`);
});

module.exports = app;
