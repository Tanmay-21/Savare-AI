import express from 'express';
import cors from 'cors';
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

const corsOptions = {
  origin: process.env.FRONTEND_URL || true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle preflight for all routes
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

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

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
