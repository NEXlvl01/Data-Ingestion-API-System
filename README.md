# Data Ingestion API System

A RESTful API system for handling data ingestion requests with priority-based processing and rate limiting.

## Features

- Asynchronous batch processing
- Priority-based queue system (HIGH, MEDIUM, LOW)
- Rate limiting (3 IDs per 5 seconds)
- Status tracking for ingestion requests
- Comprehensive test suite

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd data-ingestion-api
```

2. Install dependencies:
```bash
cd backend
npm install
```

3. Create a `.env` file in the backend directory:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/data-ingestion
NODE_ENV=development
```

## Running the Application

1. Start MongoDB:
```bash
mongod
```

2. Start the development server:
```bash
cd backend
npm run dev
```

The server will start on http://localhost:5000

## API Endpoints

### 1. Create Ingestion Request
```
POST /api/ingest
Content-Type: application/json

{
  "ids": [1, 2, 3, 4, 5],
  "priority": "HIGH"
}
```

Response:
```json
{
  "ingestion_id": "uuid-string"
}
```

### 2. Check Ingestion Status
```
GET /api/status/:ingestion_id
```

Response:
```json
{
  "ingestion_id": "uuid-string",
  "status": "triggered",
  "batches": [
    {
      "batch_id": "uuid-string",
      "ids": [1, 2, 3],
      "status": "completed"
    },
    {
      "batch_id": "uuid-string",
      "ids": [4, 5],
      "status": "triggered"
    }
  ]
}
```

## Running Tests

```bash
cd backend
npm test
```

## Design Decisions

1. **Priority Queue System**
   - Implemented using separate queues for each priority level
   - Higher priority requests are processed before lower priority ones
   - Within the same priority, requests are processed in FIFO order

2. **Rate Limiting**
   - Enforced at the batch level (3 IDs per batch)
   - 5-second delay between batch processing
   - Implemented using timestamps and async/await

3. **Status Tracking**
   - MongoDB used for persistent storage
   - Real-time status updates for each batch
   - Virtual field for overall ingestion status

4. **Error Handling**
   - Input validation for IDs and priority
   - Proper error responses for invalid requests
   - Graceful handling of processing errors

## Testing Strategy

1. **Unit Tests**
   - API endpoint validation
   - Input validation
   - Status tracking

2. **Integration Tests**
   - Priority queue behavior
   - Rate limiting
   - Batch processing

3. **End-to-End Tests**
   - Complete ingestion flow
   - Status updates
   - Error scenarios

## Future Improvements

1. Add authentication and authorization
2. Implement retry mechanism for failed batches
3. Add monitoring and logging
4. Implement batch size configuration
5. Add support for custom rate limits 