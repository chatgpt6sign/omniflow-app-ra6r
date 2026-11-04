import 'dotenv/config';
import express, { ErrorRequestHandler } from 'express';
import path from 'path';
import fs from 'fs';

// API route imports
import aiRoutes from './routes/ai';
import authRoutes from './routes/auth';
import subscriptionRoutes from './routes/subscriptions';
import ledgerRoutes from './routes/ledger';

// Configuration
import { SERVER_CONFIG } from './config/constants';

// Middleware
import { errorHandler } from './middleware/errorHandler';
import { requireAuth } from './middleware/auth';

const app = express();

// Omniflow embedded preview API compatibility
// Generated previews run in an isolated iframe origin. APIs use bearer tokens,
// so cross-origin cookies and credentials are intentionally not enabled.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});

/**
 * Static Files
 * Resolve the frontend build folder robustly across run modes:
 *  - dev: `tsx backend/server.ts`        -> <root>/frontend/dist
 *  - compiled: `node dist/backend/server.js` -> <root>/frontend/dist
 *  - cwd-based runners (OmniFlow etc.)   -> <cwd>/frontend/dist
 */
const REACT_BUILD_CANDIDATES = [
  path.join(__dirname, '..', 'frontend', 'dist'),
  path.join(__dirname, '..', '..', 'frontend', 'dist'),
  path.join(process.cwd(), 'frontend', 'dist'),
];
const REACT_BUILD_FOLDER =
  REACT_BUILD_CANDIDATES.find((candidate) => {
    try {
      return fs.existsSync(path.join(candidate, 'index.html'));
    } catch {
      return false;
    }
  }) ?? REACT_BUILD_CANDIDATES[0];
app.use(
  express.static(REACT_BUILD_FOLDER, {
    setHeaders: (res, path) => {
      // Disable caching for CSS and JS files to ensure changes are reflected immediately
      if (path.endsWith('.css') || path.endsWith('.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  })
);

app.use(
  '/assets',
  express.static(path.join(REACT_BUILD_FOLDER, 'assets'), {
    setHeaders: (res, path) => {
      // Disable caching for CSS and JS files in assets folder
      if (path.endsWith('.css') || path.endsWith('.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  })
);

// Parse JSON bodies
app.use(express.json());

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/ai', requireAuth, aiRoutes);
app.use('/api/subscriptions', requireAuth, subscriptionRoutes);
app.use('/api/ledger', requireAuth, ledgerRoutes);

/**
 * SPA Fallback Route
 * Handles client-side routing for React Router
 * Must be registered after all API routes
 */
app.get('*', (_req, res) => {
  res.sendFile(path.join(REACT_BUILD_FOLDER, 'index.html'));
});

/**
 * Error Handler
 * Must be the last middleware
 */
app.use(errorHandler as ErrorRequestHandler);

/**
 * Start Server
 */
app.listen(SERVER_CONFIG.PORT, () => {
  console.log(`Server ready on port ${SERVER_CONFIG.PORT}`);
});

export default app;
