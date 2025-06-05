const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Ingestion = require('../models/Ingestion');
const { processBatch } = require('../services/processor');
const { createIngestion } = require('../services/ingestionService');

// Helper function to validate ingestion ID format
const isValidIngestionId = (id) => {
  return /^[a-zA-Z0-9_-]+$/.test(id);
};

// Create ingestion request
router.post('/ingest', async (req, res) => {
  try {
    const { ids, priority } = req.body;
    
    // Use createIngestion function which includes all validations
    const ingestion = await createIngestion(ids, priority);
    res.status(201).json({ ingestion_id: ingestion.ingestion_id });
  } catch (error) {
    // Return 400 for validation errors
    res.status(400).json({ error: error.message });
  }
});

// Get ingestion status
router.get('/status/:ingestion_id', async (req, res) => {
  try {
    const { ingestion_id } = req.params;
    
    // Validate ingestion ID format
    if (!isValidIngestionId(ingestion_id)) {
      return res.status(400).json({ error: 'Invalid ingestion ID format' });
    }

    const ingestion = await Ingestion.findOne({ ingestion_id });
    if (!ingestion) {
      return res.status(404).json({ error: 'Ingestion not found' });
    }

    res.json(ingestion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 