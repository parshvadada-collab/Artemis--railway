'use strict';

require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const bookingRoutes = require('./routes/bookingRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const allocationRoutes = require('./routes/allocationRoutes');
const alternativeRoutes = require('./routes/alternativeRoutes');
const trainRoutes = require('./routes/trainRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

// ── Security & Parsing ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Auth route (demo login — returns JWT) ─────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    // Demo: accept any non-empty credentials and return a token
    if (!username || !password)
        return res.status(400).json({ error: 'username and password required' });
    const { signToken } = require('./middlewares/authMiddleware');
    const token = signToken({ username, role: 'user' });
    return res.json({ token, expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/bookings', bookingRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/alternatives', alternativeRoutes);
app.use('/api/trains', trainRoutes);
app.use('/api/admin', adminRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Centralized error handler ─────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
