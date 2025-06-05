const Ingestion = require('../models/Ingestion');

// Priority queue for processing batches
const priorityQueue = {
  HIGH: [],
  MEDIUM: [],
  LOW: []
};

// Processing state
let isProcessing = false;
let lastProcessTime = 0;
const RATE_LIMIT_MS = 5000; // 5 seconds

// Simulate external API call
const simulateExternalApiCall = async (id) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id, data: 'processed' });
    }, 1000); // Simulate 1 second processing time
  });
};

// Process a single batch
const processSingleBatch = async (batch) => {
  try {
    // Update batch status to triggered
    await Ingestion.updateOne(
      { 'batches.batch_id': batch.batch_id },
      { $set: { 'batches.$.status': 'triggered' } }
    );

    // Process each ID in the batch
    for (const id of batch.ids) {
      await simulateExternalApiCall(id);
    }

    // Update batch status to completed
    await Ingestion.updateOne(
      { 'batches.batch_id': batch.batch_id },
      { $set: { 'batches.$.status': 'completed' } }
    );
  } catch (error) {
    console.error('Error processing batch:', error);
  }
};

// Process next batch from queue
const processNextBatch = async () => {
  if (isProcessing) return;

  // Check rate limit
  const now = Date.now();
  if (now - lastProcessTime < RATE_LIMIT_MS) {
    setTimeout(processNextBatch, RATE_LIMIT_MS - (now - lastProcessTime));
    return;
  }

  // Get next batch based on priority
  let nextBatch = null;
  let priority = null;

  for (const p of ['HIGH', 'MEDIUM', 'LOW']) {
    if (priorityQueue[p].length > 0) {
      nextBatch = priorityQueue[p].shift();
      priority = p;
      break;
    }
  }

  if (!nextBatch) {
    isProcessing = false;
    return;
  }

  isProcessing = true;
  lastProcessTime = now;

  try {
    await processSingleBatch(nextBatch);
  } finally {
    isProcessing = false;
    processNextBatch();
  }
};

// Add ingestion to processing queue
const processBatch = (ingestion) => {
  // Add all batches to the priority queue
  ingestion.batches.forEach(batch => {
    priorityQueue[ingestion.priority].push(batch);
  });

  // Start processing if not already running
  if (!isProcessing) {
    processNextBatch();
  }
};

module.exports = {
  processBatch
}; 