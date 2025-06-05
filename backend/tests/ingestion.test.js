const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Ingestion = require('../models/Ingestion');
const { processBatches, stopProcessing } = require('../services/ingestionService');

describe('Data Ingestion API', () => {
  let batchProcessor;
  let isProcessing = true;

  beforeAll(async () => {
    // Only connect if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/data-ingestion-test');
    }
    // Start batch processing for tests
    batchProcessor = processBatches();
  });

  afterAll(async () => {
    try {
      // Stop batch processing and wait for it to complete
      isProcessing = false;
      await stopProcessing();
      
      // Wait a bit to ensure all operations are complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Close the connection after all tests
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
    } catch (error) {
      // Ignore cleanup errors
      console.error('Cleanup error:', error);
    }
  });

  // Clean up the database before each test
  beforeEach(async () => {
    await Ingestion.deleteMany({});
  });

  // Helper function to wait for batch processing
  const waitForBatchProcessing = async (ingestionId, expectedStatus, timeout = 30000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout && isProcessing) {
      try {
        const response = await request(app).get(`/api/status/${ingestionId}`);
        if (response.body.batches[0].status === expectedStatus) {
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        // Ignore errors during waiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return false;
  };

  describe('POST /api/ingest', () => {
    it('should create a new ingestion request', async () => {
      const response = await request(app)
        .post('/api/ingest')
        .send({
          ids: [1, 2, 3, 4, 5],
          priority: 'HIGH'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('ingestion_id');
    });

    it('should validate input data', async () => {
      const response = await request(app)
        .post('/api/ingest')
        .send({
          ids: [1, 2, 3],
          priority: 'INVALID'
        });

      expect(response.status).toBe(400);
    });

    it('should validate ID range', async () => {
      const response = await request(app)
        .post('/api/ingest')
        .send({
          ids: [0, 1, 2],
          priority: 'HIGH'
        });

      expect(response.status).toBe(400);
    });

    it('should handle empty ID array', async () => {
      const response = await request(app)
        .post('/api/ingest')
        .send({
          ids: [],
          priority: 'HIGH'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle duplicate IDs', async () => {
      const response = await request(app)
        .post('/api/ingest')
        .send({
          ids: [1, 1, 2, 2, 3],
          priority: 'HIGH'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/status/:ingestion_id', () => {
    it('should return ingestion status', async () => {
      // Create an ingestion request first
      const ingestion = new Ingestion({
        ingestion_id: 'test123',
        priority: 'HIGH',
        batches: [
          {
            batch_id: 'batch1',
            ids: [1, 2, 3],
            status: 'completed'
          },
          {
            batch_id: 'batch2',
            ids: [4, 5],
            status: 'triggered'
          }
        ]
      });
      await ingestion.save();

      const response = await request(app)
        .get('/api/status/test123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ingestion_id', 'test123');
      expect(response.body).toHaveProperty('status', 'triggered');
      expect(response.body.batches).toHaveLength(2);
    });

    it('should return 404 for non-existent ingestion', async () => {
      const response = await request(app)
        .get('/api/status/nonexistent');

      expect(response.status).toBe(404);
    });

    it('should handle invalid ingestion ID format', async () => {
      const response = await request(app)
        .get('/api/status/invalid@id');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting and Processing', () => {
    it('should respect rate limiting of 1 batch per 5 seconds', async () => {
      const ingestion = new Ingestion({
        ingestion_id: 'rate1',
        priority: 'HIGH',
        batches: [
          { batch_id: 'batch1', ids: [1, 2, 3], status: 'yet_to_start' },
          { batch_id: 'batch2', ids: [4, 5, 6], status: 'yet_to_start' }
        ]
      });
      await ingestion.save();

      // Wait for first batch to complete
      const firstBatchCompleted = await waitForBatchProcessing('rate1', 'completed');
      expect(firstBatchCompleted).toBe(true);

      // Check status immediately after first batch completes
      const status = await request(app).get('/api/status/rate1');
      const completedBatches = status.body.batches.filter(b => b.status === 'completed');
      expect(completedBatches.length).toBe(1);
    });

    it('should process based on creation time', async () => {
      // Create requests with same priority but different creation times
      const firstRequest = new Ingestion({
        ingestion_id: 'first',
        priority: 'MEDIUM',
        created_at: new Date(Date.now() - 1000), // 1 second ago
        batches: [{ batch_id: 'first1', ids: [1, 2, 3], status: 'yet_to_start' }]
      });

      const secondRequest = new Ingestion({
        ingestion_id: 'second',
        priority: 'MEDIUM',
        created_at: new Date(),
        batches: [{ batch_id: 'second1', ids: [4, 5, 6], status: 'yet_to_start' }]
      });

      await Promise.all([
        firstRequest.save(),
        secondRequest.save()
      ]);

      // Wait for first request to complete
      const firstRequestCompleted = await waitForBatchProcessing('first', 'completed');
      expect(firstRequestCompleted).toBe(true);

      // Check status of both requests
      const [firstStatus, secondStatus] = await Promise.all([
        request(app).get('/api/status/first'),
        request(app).get('/api/status/second')
      ]);

      // First request should be completed
      expect(firstStatus.body.batches[0].status).toBe('completed');
      
      // Second request should be triggered or yet_to_start
      expect(['triggered', 'yet_to_start']).toContain(secondStatus.body.batches[0].status);
    });

    it('should handle concurrent ingestion requests', async () => {
      // Create multiple ingestion requests simultaneously
      const requests = Array.from({ length: 3 }, (_, i) => ({
        ingestion_id: `concurrent${i}`,
        priority: 'HIGH',
        batches: [{ batch_id: `batch${i}`, ids: [1, 2, 3], status: 'yet_to_start' }]
      }));

      await Promise.all(requests.map(req => new Ingestion(req).save()));

      // Wait for all requests to be processed
      const results = await Promise.all(
        requests.map(req => waitForBatchProcessing(req.ingestion_id, 'completed'))
      );

      // All requests should be processed
      expect(results.every(result => result)).toBe(true);
    });

    it('should handle large number of IDs', async () => {
      // Create an ingestion request with a large number of IDs
      const largeIds = Array.from({ length: 100 }, (_, i) => i + 1);
      const response = await request(app)
        .post('/api/ingest')
        .send({
          ids: largeIds,
          priority: 'HIGH'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('ingestion_id');

      // Verify that IDs are properly batched
      const status = await request(app).get(`/api/status/${response.body.ingestion_id}`);
      expect(status.body.batches.length).toBeGreaterThan(1);
      expect(status.body.batches.every(batch => batch.ids.length <= 10)).toBe(true);
    });
  });
}); 