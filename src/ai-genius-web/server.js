'use strict';

const express = require('express');
const healthRouter = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Routes
app.use('/health', healthRouter);

app.get('/', (req, res) => {
  res.json({
    name: 'AI Genius SpecKit Demo',
    version: process.env.npm_package_version || '1.0.0',
    description: 'Agentic DevOps with SpecKit',
    endpoints: ['/health', '/api/status'],
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    speckit: {
      enabled: true,
      version: '1.0.0',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('📋 SpecKit Demo API ready');
  });
}

module.exports = app;
