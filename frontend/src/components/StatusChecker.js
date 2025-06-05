import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import axios from 'axios';

const StatusChecker = () => {
  const [ingestionId, setIngestionId] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  const checkStatus = async () => {
    if (!ingestionId) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`http://localhost:5000/status/${ingestionId}`);
      setStatus(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval;
    if (polling && ingestionId) {
      interval = setInterval(checkStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [polling, ingestionId]);

  const handleCheckStatus = () => {
    checkStatus();
  };

  const handleStartPolling = () => {
    setPolling(true);
    checkStatus();
  };

  const handleStopPolling = () => {
    setPolling(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'triggered':
        return 'warning';
      case 'yet_to_start':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Check Ingestion Status
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          fullWidth
          label="Ingestion ID"
          value={ingestionId}
          onChange={(e) => setIngestionId(e.target.value)}
          required
        />
        <Button
          variant="contained"
          onClick={handleCheckStatus}
          disabled={loading || !ingestionId}
        >
          Check Status
        </Button>
        {!polling ? (
          <Button
            variant="outlined"
            onClick={handleStartPolling}
            disabled={loading || !ingestionId}
          >
            Start Polling
          </Button>
        ) : (
          <Button
            variant="outlined"
            color="error"
            onClick={handleStopPolling}
          >
            Stop Polling
          </Button>
        )}
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {status && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Overall Status: <Chip label={status.status} color={getStatusColor(status.status)} />
          </Typography>

          <List>
            {status.batches.map((batch) => (
              <ListItem key={batch.batch_id}>
                <ListItemText
                  primary={`Batch ${batch.batch_id}`}
                  secondary={`IDs: ${batch.ids.join(', ')}`}
                />
                <Chip
                  label={batch.status}
                  color={getStatusColor(batch.status)}
                  size="small"
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Paper>
  );
};

export default StatusChecker; 