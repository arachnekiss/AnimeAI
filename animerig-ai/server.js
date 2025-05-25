const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com", "wss:", "ws:"],
      mediaSrc: ["'self'", "blob:"],
      workerSrc: ["'self'", "blob:"],
    },
  },
}));

// Compression middleware
app.use(compression());

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1y',
  etag: true,
}));

// Serve showcase build if available
app.use('/showcase', express.static(path.join(__dirname, 'dist-showcase'), {
  maxAge: '1y',
  etag: true,
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mode: process.env.NODE_ENV || 'development'
  });
});

// API endpoints for OpenAI integration
app.use('/api', require('./dist/backend/routes/openai.js'));

// Handle React Router - serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Check if it's a showcase request
  if (req.path.startsWith('/showcase')) {
    res.sendFile(path.join(__dirname, 'dist-showcase', 'index.showcase.html'));
  } else {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 AI Character Engine running on port ${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🎭 Main app: http://localhost:${port}`);
  console.log(`🎨 Showcase: http://localhost:${port}/showcase`);
  console.log(`💚 Health check: http://localhost:${port}/health`);
});

module.exports = app;
