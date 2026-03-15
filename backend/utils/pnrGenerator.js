'use strict';

const crypto = require('crypto');
const pool = require('./db');

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const PNR_LEN = 10;
const MAX_RETRIES = 3;

/**
 * Generate a single random PNR string (10 uppercase alphanumeric characters).
 * Uses crypto.randomBytes — never Math.random().
 */
function generateCode() {
    const bytes = crypto.randomBytes(PNR_LEN);
    return Array.from(bytes)
        .map(b => CHARSET[b % CHARSET.length])
        .join('');
}

/**
 * Generate a unique PNR that does not exist in the bookings table.
 * Retries up to MAX_RETRIES times before throwing.
 *
 * @returns {Promise<string>} Unique PNR code
 */
async function generateUniquePNR() {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const code = generateCode();
        const [rows] = await pool.execute(
            'SELECT id FROM bookings WHERE pnr_code = ? LIMIT 1',
            [code]
        );
        if (rows.length === 0) {
            return code;
        }
        console.warn(`[PNR] Collision on attempt ${attempt}: ${code}`);
    }
    throw new Error('PNR generation failed after maximum retries');
}

module.exports = { generateUniquePNR };
