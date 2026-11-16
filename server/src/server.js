console.log('🍵 Starting ChaiCraft Tea Business Server...');
require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = Number(process.env.PORT) || 5005;

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🍵 ChaiCraft Tea Business Server is running on http://localhost:${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API Health Check: http://localhost:${PORT}/api/health`);
  
  // Connect to MongoDB
  connectDB();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use! Another process is already running on port ${PORT}.`);
    console.error(`👉 Run this to free the port: lsof -ti :${PORT} | xargs kill -9\n`);
  } else {
    console.error(`❌ Server error:`, err.message);
  }
  process.exit(1);
});
