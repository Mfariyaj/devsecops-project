const express = require('express');
const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'payment-service', timestamp: new Date().toISOString() });
});

// Process payment
app.post('/payments', (req, res) => {
  try {
    const { orderId, amount, method, cardLast4 } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId is required' });
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid amount is required' });
    }
    if (!method || !['credit_card', 'debit_card', 'upi', 'wallet'].includes(method)) {
      return res.status(400).json({ success: false, error: 'Valid payment method is required (credit_card, debit_card, upi, wallet)' });
    }

    const payment = {
      transactionId: `TXN-${Date.now()}`,
      orderId,
      amount,
      method,
      cardLast4: cardLast4 || null,
      status: 'confirmed',
      processedAt: new Date().toISOString()
    };

    res.status(201).json({ success: true, message: 'Payment processed successfully', data: payment });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Payment processing failed', message: error.message });
  }
});

// Get payment status
app.get('/payments/:transactionId', (req, res) => {
  try {
    const { transactionId } = req.params;
    const payment = {
      transactionId,
      orderId: 'ORD-001',
      amount: 159.98,
      method: 'credit_card',
      cardLast4: '4242',
      status: 'confirmed',
      processedAt: '2026-07-07T10:30:00Z'
    };
    res.status(200).json({ success: true, data: payment });
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
  console.log(`Payment service running on port ${PORT}`);
});

module.exports = app;
