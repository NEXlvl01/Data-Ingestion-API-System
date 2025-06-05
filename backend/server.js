const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const ingestionRoutes = require('./routes/ingestion');
const { processBatches } = require('./services/ingestionService');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Data Ingestion API System',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      ingest: '/api/ingest',
      status: '/api/status/:ingestion_id'
    },
    documentation: 'API documentation will be available soon'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// MongoDB Connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.NODE_ENV === 'test' 
      ? 'mongodb://localhost:27017/data-ingestion-test'
      : process.env.MONGODB_URI || 'mongodb://localhost:27017/data-ingestion';
    
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');
    
    // Start batch processing only after successful connection
    if (process.env.NODE_ENV !== 'test') {
      processBatches();
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Routes
app.use('/api', ingestionRoutes);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

// Only start the server if we're not in a Vercel environment
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, async () => {
    await connectDB();
    console.log(`Server is running on port ${PORT}`);
  });
} else {
  // For Vercel, just connect to MongoDB
  connectDB();
}

// Export the Express API
module.exports = app; 
