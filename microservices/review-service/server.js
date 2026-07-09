const express = require('express');
const app = express();
const PORT = process.env.PORT || 3009;

app.use(express.json());

// In-memory reviews store
const reviews = [
  { id: 'REV-001', productId: 'SKU-001', userId: 'user-1', rating: 5, title: 'Excellent product', comment: 'Works perfectly, highly recommend!', createdAt: '2026-07-01T12:00:00Z' },
  { id: 'REV-002', productId: 'SKU-001', userId: 'user-2', rating: 4, title: 'Good quality', comment: 'Solid build, minor issues with packaging.', createdAt: '2026-07-02T09:30:00Z' },
  { id: 'REV-003', productId: 'SKU-002', userId: 'user-3', rating: 3, title: 'Average', comment: 'Does the job but nothing special.', createdAt: '2026-07-03T15:45:00Z' },
  { id: 'REV-004', productId: 'SKU-003', userId: 'user-1', rating: 5, title: 'Amazing gadget', comment: 'Best purchase this year!', createdAt: '2026-07-04T18:20:00Z' }
];

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'review-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get all reviews
app.get('/reviews', (req, res) => {
  try {
    const { productId, minRating } = req.query;
    let results = [...reviews];

    if (productId) {
      results = results.filter(r => r.productId === productId);
    }

    if (minRating) {
      const min = parseInt(minRating, 10);
      results = results.filter(r => r.rating >= min);
    }

    const avgRating = results.length > 0
      ? (results.reduce((sum, r) => sum + r.rating, 0) / results.length).toFixed(1)
      : 0;

    res.status(200).json({
      reviews: results,
      total: results.length,
      averageRating: parseFloat(avgRating),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Get review by ID
app.get('/reviews/:id', (req, res) => {
  try {
    const review = reviews.find(r => r.id === req.params.id);

    if (!review) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Review ${req.params.id} not found`
      });
    }

    res.status(200).json(review);
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Create a new review
app.post('/reviews', (req, res) => {
  try {
    const { productId, userId, rating, title, comment } = req.body;

    if (!productId || !userId || !rating) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'productId, userId, and rating fields are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'rating must be between 1 and 5'
      });
    }

    const newReview = {
      id: `REV-${String(reviews.length + 1).padStart(3, '0')}`,
      productId,
      userId,
      rating,
      title: title || '',
      comment: comment || '',
      createdAt: new Date().toISOString()
    };

    reviews.push(newReview);

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      review: newReview
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Delete a review
app.delete('/reviews/:id', (req, res) => {
  try {
    const reviewIndex = reviews.findIndex(r => r.id === req.params.id);

    if (reviewIndex === -1) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Review ${req.params.id} not found`
      });
    }

    reviews.splice(reviewIndex, 1);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
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
  console.log(`Review service running on port ${PORT}`);
});

module.exports = app;
