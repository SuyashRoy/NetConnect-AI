/**
 * NetConnect AI - Backend Server
 * Provides the broadband lookup pipeline:
 *   Address → Google Maps Geocoding → Census Block FIPS → PostgreSQL → JSON
 */

import express from 'express';
import cors from 'cors';
import config from './config.js';
import { testConnection } from './db/connection.js';
import { testConnection as testMongo } from './db/mongoConnection.js';
import broadbandRouter from './routes/broadband.js';
import cacheRouter from './routes/cache.js';

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173'], // Vite dev & preview
}));
app.use(express.json());

// Routes
app.use('/api/broadband', broadbandRouter);
app.use('/api/cache', cacheRouter);

// Root endpoint
app.get('/api', (_req, res) => {
  res.json({
    name: 'NetConnect AI - Broadband Lookup API',
    version: '1.0.0',
    endpoints: {
      lookup: 'GET /api/broadband/lookup?address=...',
      byCoordinates: 'GET /api/broadband/by-coordinates?lat=...&lon=...',
      coverage: 'GET /api/broadband/coverage',
      health: 'GET /api/broadband/health',
      cacheGet: 'GET /api/cache/:namespace/:key',
      cacheSet: 'POST /api/cache/:namespace/:key',
      cacheDel: 'DELETE /api/cache/:namespace/:key',
      cacheClear: 'DELETE /api/cache/:namespace',
    },
  });
});

// Start server
const start = async () => {
  // Verify database connections
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error('[Server] WARNING: Database connection failed. The server will start but lookups will fail.');
  }

  const mongoOk = await testMongo();

  app.listen(config.port, () => {
    console.log(`\n[Server] NetConnect AI Backend running on http://localhost:${config.port}`);
    console.log(`[Server] API docs: http://localhost:${config.port}/api`);
    console.log(`[Server] Health:   http://localhost:${config.port}/api/broadband/health`);
    console.log(`[Server] Cache: ${mongoOk ? 'MongoDB (persistent)' : 'None (degraded)'}`);
    console.log(`[Server] Covered states: ${config.coveredStateAbbreviations.join(', ')}\n`);
  });
};

start();
