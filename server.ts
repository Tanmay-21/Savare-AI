import dotenv from 'dotenv';
import express from 'express';

dotenv.config();
import usersMe from './api/users/me.js';
import usersRegister from './api/users/register.js';
import authDemo from './api/auth/demo.js';
import ordersIndex from './api/orders/index.js';
import ordersById from './api/orders/_id.js';
import shipmentsIndex from './api/shipments/index.js';
import shipmentsById from './api/shipments/_id.js';
import vehiclesIndex from './api/vehicles/index.js';
import vehiclesById from './api/vehicles/_id.js';
import driversIndex from './api/drivers/index.js';
import driversById from './api/drivers/_id.js';
import expensesIndex from './api/expenses/index.js';
import expensesById from './api/expenses/_id.js';
import lrsIndex from './api/lrs/index.js';
import lrsGenerate from './api/lrs/generate.js';
import countersNext from './api/counters/next.js';

const app = express();

// 1. Diagnostic Startup Logs
console.log('--- SERVER BOOTING ---');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET');
console.log('PORT:', process.env.PORT || 3001);

// 2. Global Request Logger (Catch everything)
app.use((req, res, next) => {
  const logMsg = `[LOG] ${req.method} ${req.url} | Origin: ${req.headers.origin || 'none'}`;
  console.log(logMsg);
  next();
});

// 3. Robust CORS Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedStr = process.env.FRONTEND_URL;
  
  // Set fundamental headers for EVERY response
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (origin) {
    const allowedOrigins = allowedStr ? allowedStr.split(',').map(o => o.trim().toLowerCase().replace(/\/$/, '')) : [];
    const normalizedOrigin = origin.toLowerCase().replace(/\/$/, '');
    
    const isAllowed = !allowedStr || allowedOrigins.includes(normalizedOrigin) || 
                     allowedOrigins.some(ao => !ao.includes('://') && (normalizedOrigin.endsWith(ao) || normalizedOrigin === ao));

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      console.log(`[CORS REJECT] ${origin} not matched in '${allowedStr || 'ANY'}'`);
    }
  } else if (!allowedStr) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  if (req.method === 'OPTIONS') {
    // Force allow the origin on preflights so the browser lets the request through to see real logs
    if (origin && !res.getHeader('Access-Control-Allow-Origin')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    return res.status(204).end();
  }
  next();
});

app.use(express.json());

app.get('/health', (_req, res) => {
  console.log('[LOG] Health check responder hit');
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.all('/api/users/me', usersMe);
app.all('/api/users/register', usersRegister);
app.all('/api/auth/demo', authDemo);
app.all('/api/orders', ordersIndex);
app.all('/api/orders/:id', ordersById);
app.all('/api/shipments', shipmentsIndex);
app.all('/api/shipments/:id', shipmentsById);
app.all('/api/vehicles', vehiclesIndex);
app.all('/api/vehicles/:id', vehiclesById);
app.all('/api/drivers', driversIndex);
app.all('/api/drivers/:id', driversById);
app.all('/api/expenses', expensesIndex);
app.all('/api/expenses/:id', expensesById);
app.all('/api/lrs', lrsIndex);
app.all('/api/lrs/generate', lrsGenerate);
app.all('/api/counters/next', countersNext);

// 4. Catch-all 404 handler (Logs what went wrong)
app.use((req, res) => {
  console.log(`[404 ERROR] Browser hit: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Endpoint not found', path: req.url });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`--- API SYSTEM ONLINE ON PORT ${port} ---`);
  console.log(`--- API listening. FRONTEND_URL: ${process.env.FRONTEND_URL || 'ANY'} ---`);
});
