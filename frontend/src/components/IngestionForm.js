import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  Alert
} from '@mui/material';
import axios from 'axios';

const IngestionForm = () => {
  const [ids, setIds] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [ingestionId, setIngestionId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Parse and validate IDs
      const idArray = ids.split(',').map(id => parseInt(id.trim()));
      if (idArray.some(isNaN)) {
        throw new Error('Invalid ID format. Please enter comma-separated numbers.');
      }

      const response = await axios.post('http://localhost:5000/api/ingest', {
        ids: idArray,
        priority
      });

      setIngestionId(response.data.ingestion_id);
      setSuccess('Ingestion request created successfully!');
      setIds('');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        Create Ingestion Request
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          fullWidth
          label="IDs (comma-separated)"
          value={ids}
          onChange={(e) => setIds(e.target.value)}
          margin="normal"
          required
          helperText="Enter comma-separated numbers (e.g., 1,2,3,4,5)"
        />

        <FormControl fullWidth margin="normal">
          <InputLabel>Priority</InputLabel>
          <Select
            value={priority}
            label="Priority"
            onChange={(e) => setPriority(e.target.value)}
          >
            <MenuItem value="HIGH">High</MenuItem>
            <MenuItem value="MEDIUM">Medium</MenuItem>
            <MenuItem value="LOW">Low</MenuItem>
          </Select>
        </FormControl>

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
        >
          Submit
        </Button>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
            {ingestionId && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Ingestion ID: {ingestionId}
              </Typography>
            )}
          </Alert>
        )}
      </Box>
    </Paper>
  );
};

export default IngestionForm; 