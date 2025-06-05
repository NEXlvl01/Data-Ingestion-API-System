const mongoose = require('mongoose');
const Ingestion = require('../models/Ingestion');
const { v4: uuidv4 } = require('uuid');

let isProcessing = false;
let lastProcessedTime = 0;
const RATE_LIMIT_MS = 5000; // 5 seconds between batches

// Priority mapping
const PRIORITY_MAP = {
  'HIGH': 3,
  'MEDIUM': 2,
  'LOW': 1
};

const processBatches = async () => {
  if (isProcessing) return;
  isProcessing = true;

  while (isProcessing) {
    try {
      // Check MongoDB connection
      if (mongoose.connection.readyState !== 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      // Find the highest priority ingestion with a batch yet to start
      const ingestion = await Ingestion.findOne({
        'batches.status': 'yet_to_start'
      }).sort({
        priority: -1,
        created_at: 1
      });

      if (!ingestion) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      // Find the first batch that's yet to start
      const batch = ingestion.batches.find(b => b.status === 'yet_to_start');
      if (!batch) {
        continue;
      }

      // Check rate limiting
      const now = Date.now();
      if (now - lastProcessedTime < RATE_LIMIT_MS) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - (now - lastProcessedTime)));
      }

      // Update batch status to triggered
      const triggeredIngestion = await Ingestion.findOneAndUpdate(
        {
          _id: ingestion._id,
          'batches.batch_id': batch.batch_id,
          'batches.status': 'yet_to_start'
        },
        {
          $set: {
            'batches.$.status': 'triggered'
          }
        },
        { new: true }
      );

      if (!triggeredIngestion) {
        continue;
      }

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update batch status to completed
      const completedIngestion = await Ingestion.findOneAndUpdate(
        {
          _id: ingestion._id,
          'batches.batch_id': batch.batch_id,
          'batches.status': 'triggered'
        },
        {
          $set: {
            'batches.$.status': 'completed'
          }
        },
        { new: true }
      );

      if (!completedIngestion) {
        continue;
      }

      // Check if all batches are completed
      const allCompleted = completedIngestion.batches.every(b => b.status === 'completed');
      if (allCompleted) {
        await Ingestion.findByIdAndUpdate(
          completedIngestion._id,
          { $set: { status: 'completed' } }
        );
      }

      lastProcessedTime = Date.now();

    } catch (error) {
      if (error.name === 'MongoNotConnectedError') {
        isProcessing = false;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

const stopProcessing = async () => {
  isProcessing = false;
  // Wait for any ongoing processing to complete
  await new Promise(resolve => setTimeout(resolve, 2000));
};

const createIngestion = async (ids, priority) => {
  // Validate input
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('IDs must be a non-empty array');
  }

  // Validate ID range and duplicates
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    throw new Error('Duplicate IDs are not allowed');
  }

  for (const id of ids) {
    if (typeof id !== 'number' || id < 1 || id > 1000) {
      throw new Error('IDs must be numbers between 1 and 1000');
    }
  }

  // Validate priority
  if (!['HIGH', 'MEDIUM', 'LOW'].includes(priority)) {
    throw new Error('Priority must be HIGH, MEDIUM, or LOW');
  }

  // Create batches of 10 IDs each
  const batches = [];
  for (let i = 0; i < ids.length; i += 10) {
    const batchIds = ids.slice(i, i + 10);
    batches.push({
      batch_id: uuidv4(),
      ids: batchIds,
      status: 'yet_to_start'
    });
  }

  // Create ingestion request
  const ingestion = new Ingestion({
    ingestion_id: uuidv4(),
    priority,
    batches,
    status: 'triggered'
  });

  await ingestion.save();
  return ingestion;
};

module.exports = {
  processBatches,
  stopProcessing,
  createIngestion
}; 