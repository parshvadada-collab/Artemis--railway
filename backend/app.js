'use strict';

require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const bookingRoutes = require('./routes/bookingRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const allocationRoutes = require('./routes/allocationRoutes');
const alternativeRoutes = require('./routes/alternativeRoutes');
const trainRoutes = require('./routes/trainRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chatRoutes = require('./routes/chatRoutes');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

// ── Security & Parsing ────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false })); // disable CSP so React assets load
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
    if (!username || !password)
        return res.status(400).json({ error: 'username and password required' });

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const isAdmin = username === adminUsername && password === adminPassword;

    const { signToken } = require('./middlewares/authMiddleware');
    const token = signToken({ username, role: isAdmin ? 'admin' : 'user' });
    return res.json({
        token,
        role: isAdmin ? 'admin' : 'user',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/bookings', bookingRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/alternatives', alternativeRoutes);
app.use('/api/trains', trainRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

// ── Serve React frontend (built files) ───────────────────────────────────────
const distPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(distPath));

// SPA fallback — any non-API route serves index.html so React Router works
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// ── Centralized error handler ─────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;

