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

// Connect to MongoDB
connectDB();

// Routes
app.use('/api', ingestionRoutes);

// Export app for testing
module.exports = app;

// Only start the server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
} 