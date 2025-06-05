const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batch_id: {
    type: String,
    required: true
  },
  ids: [{
    type: Number,
    required: true
  }],
  status: {
    type: String,
    enum: ['yet_to_start', 'triggered', 'completed'],
    default: 'yet_to_start'
  }
});

const ingestionSchema = new mongoose.Schema({
  ingestion_id: {
    type: String,
    required: true,
    unique: true
  },
  priority: {
    type: String,
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    required: true
  },
  batches: [batchSchema],
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Virtual for overall status
ingestionSchema.virtual('status').get(function() {
  if (this.batches.length === 0) return 'yet_to_start';
  
  const allCompleted = this.batches.every(batch => batch.status === 'completed');
  const anyTriggered = this.batches.some(batch => batch.status === 'triggered');
  
  if (allCompleted) return 'completed';
  if (anyTriggered) return 'triggered';
  return 'yet_to_start';
});

// Ensure virtuals are included in JSON output
ingestionSchema.set('toJSON', { virtuals: true });
ingestionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Ingestion', ingestionSchema); 