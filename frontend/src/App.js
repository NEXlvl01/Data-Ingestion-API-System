import React from 'react';
import { Container, Typography, Box, CssBaseline } from '@mui/material';
import IngestionForm from './components/IngestionForm';
import StatusChecker from './components/StatusChecker';

function App() {
  return (
    <>
      <CssBaseline />
      <Container maxWidth="md">
        <Box sx={{ my: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom align="center">
            Data Ingestion System
          </Typography>
          <IngestionForm />
          <StatusChecker />
        </Box>
      </Container>
    </>
  );
}

export default App;
