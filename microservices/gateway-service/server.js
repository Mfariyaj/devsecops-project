const express = require('express');
const http = require('http');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Service registry
const services = {
  'notification-service': {
    host: process.env.NOTIFICATION_HOST || 'localhost',
    port: process.env.NOTIFICATION_PORT || 3006,
    endpoints: ['GET /health', 'POST /notify', 'GET /notifications']
  },
  'inventory-service': {
    host: process.env.INVENTORY_HOST || 'localhost',
    port: process.env.INVENTORY_PORT || 3007,
    endpoints: ['GET /health', 'GET /inventory', 'GET /inventory/:id', 'PUT /inventory/:id']
  },
  'shipping-service': {
    host: process.env.SHIPPING_HOST || 'localhost',
    port: process.env.SHIPPING_PORT || 3008,
    endpoints: ['GET /health', 'GET /shipments', 'GET /shipments/:id', 'POST /shipments', 'PATCH /shipments/:id']
  },
  'review-service': {
    host: process.env.REVIEW_HOST || 'localhost',
    port: process.env.REVIEW_PORT || 3009,
    endpoints: ['GET /health', 'GET /reviews', 'GET /reviews/:id', 'POST /reviews', 'DELETE /reviews/:id']
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'gateway-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// List all available service endpoints
app.get('/', (req, res) => {
  const serviceList = Object.entries(services).map(([name, config]) => ({
    name,
    url: `http://${config.host}:${config.port}`,
    endpoints: config.endpoints
  }));

  res.status(200).json({
    service: 'gateway-service',
    version: '1.0.0',
    description: 'API Gateway - Central entry point for all microservices',
    registeredServices: serviceList,
    gatewayEndpoints: [
      'GET / - List all service endpoints',
      'GET /health - Gateway health check',
      'GET /services/:name/health - Check health of a specific service',
      'ALL /proxy/:service/* - Proxy requests to backend services'
    ],
    timestamp: new Date().toISOString()
  });
});

// Check health of a specific service
app.get('/services/:name/health', (req, res) => {
  const serviceName = req.params.name;
  const service = services[serviceName];

  if (!service) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Service '${serviceName}' is not registered`,
      availableServices: Object.keys(services)
    });
  }

  const options = {
    hostname: service.host,
    port: service.port,
    path: '/health',
    method: 'GET',
    timeout: 5000
  };

  const proxyReq = http.request(options, (proxyRes) => {
    let data = '';
    proxyRes.on('data', (chunk) => { data += chunk; });
    proxyRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        res.status(proxyRes.statusCode).json(parsed);
      } catch (e) {
        res.status(200).json({ status: 'UP', raw: data });
      }
    });
  });

  proxyReq.on('error', (error) => {
    res.status(503).json({
      status: 'DOWN',
      service: serviceName,
      error: error.message,
      message: `Unable to reach ${serviceName} at ${service.host}:${service.port}`
    });
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    res.status(504).json({
      status: 'TIMEOUT',
      service: serviceName,
      message: `Request to ${serviceName} timed out`
    });
  });

  proxyReq.end();
});

// Proxy requests to backend services
app.all('/proxy/:service/*', (req, res) => {
  const serviceName = req.params.service;
  const service = services[serviceName];

  if (!service) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Service '${serviceName}' is not registered`,
      availableServices: Object.keys(services)
    });
  }

  const targetPath = '/' + req.params[0];
  const options = {
    hostname: service.host,
    port: service.port,
    path: targetPath,
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': req.ip,
      'X-Gateway-Request-Id': `gw-${Date.now()}`
    },
    timeout: 10000
  };

  const proxyReq = http.request(options, (proxyRes) => {
    let data = '';
    proxyRes.on('data', (chunk) => { data += chunk; });
    proxyRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        res.status(proxyRes.statusCode).json(parsed);
      } catch (e) {
        res.status(proxyRes.statusCode).send(data);
      }
    });
  });

  proxyReq.on('error', (error) => {
    res.status(502).json({
      error: 'Bad Gateway',
      message: `Failed to proxy request to ${serviceName}: ${error.message}`
    });
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    res.status(504).json({
      error: 'Gateway Timeout',
      message: `Request to ${serviceName} timed out`
    });
  });

  if (req.body && Object.keys(req.body).length > 0) {
    proxyReq.write(JSON.stringify(req.body));
  }

  proxyReq.end();
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    hint: 'Use GET / to see available endpoints'
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
  console.log(`Gateway service running on port ${PORT}`);
  console.log(`Registered services: ${Object.keys(services).join(', ')}`);
});

module.exports = app;
