'use strict';

const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev_fallback_secret_change_in_production';

/**
 * Middleware: verifies Bearer JWT in Authorization header.
 * Attaches decoded payload to req.user on success.
 */
function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.slice(7);
    try {
        const payload = jwt.verify(token, SECRET);
        req.user = payload;
        next();
    } catch (err) {
        const msg = err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token';
        return res.status(401).json({ error: msg });
    }
}

/**
 * Generate a signed JWT for a given user payload.
 */
function signToken(payload) {
    return jwt.sign(payload, SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
}

module.exports = { authMiddleware, signToken };
