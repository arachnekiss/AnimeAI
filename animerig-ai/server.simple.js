const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from dist-showcase directory
app.use('/showcase', express.static(path.join(__dirname, 'dist-showcase')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mode: 'showcase'
  });
});

// Handle showcase route
app.get('/showcase', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist-showcase', 'index.showcase.html'));
});

// Default route redirects to showcase
app.get('/', (req, res) => {
  res.redirect('/showcase');
});

// Catch all other routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/showcase')) {
    res.sendFile(path.join(__dirname, 'dist-showcase', 'index.showcase.html'));
  } else {
    res.redirect('/showcase');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🎭 AI Character Engine Showcase running on port ${port}`);
  console.log(`🎨 Showcase: http://localhost:${port}/showcase`);
  console.log(`🏠 Home: http://localhost:${port}/`);
  console.log(`💚 Health check: http://localhost:${port}/health`);
});

module.exports = app;
