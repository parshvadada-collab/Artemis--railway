'use strict';

const { body } = require('express-validator');
const pool = require('../utils/db');
const bookingModel = require('../models/bookingModel');
const seatModel = require('../models/seatModel');
const waitlistModel = require('../models/waitlistModel');
const { generateUniquePNR } = require('../utils/pnrGenerator');

// ── Validation rules ──────────────────────────────────────────────────────────

const createBookingValidation = [
    body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Passenger name required (max 100)'),
    body('age').isInt({ min: 1, max: 120 }).withMessage('Age must be 1–120'),
    body('contact').trim().notEmpty().isLength({ max: 20 }).withMessage('Contact required'),
    body('train_id').isInt({ min: 1 }).withMessage('Valid train_id required'),
    body('seat_class').isIn(['SL', '3A', '2A', '1A']).withMessage('seat_class must be SL|3A|2A|1A'),
];

const updateBookingValidation = [
    body('name').optional().trim().isLength({ max: 100 }),
    body('age').optional().isInt({ min: 1, max: 120 }),
    body('contact').optional().trim().isLength({ max: 20 }),
    body('seat_class').optional().isIn(['SL', '3A', '2A', '1A']),
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function createHttpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/bookings
 * Create booking, assign confirmed or waitlisted status.
 */
async function createBooking(req, res, next) {
    const { name, age, contact, train_id, seat_class } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Insert passenger
        const [passResult] = await conn.execute(
            'INSERT INTO passengers (name, age, contact) VALUES (?, ?, ?)',
            [name, age, contact]
        );
        const passenger_id = passResult.insertId;

        // 2. Try to grab an available seat (row-level lock)
        const [availableSeats] = await conn.execute(
            'SELECT * FROM seats WHERE train_id = ? AND class = ? AND is_available = TRUE LIMIT 1 FOR UPDATE',
            [train_id, seat_class]
        );

        let seat_id = null;
        let status = 'waitlisted';

        if (availableSeats.length > 0) {
            seat_id = availableSeats[0].id;
            status = 'confirmed';
            await conn.execute('UPDATE seats SET is_available = FALSE WHERE id = ?', [seat_id]);
        }

        // 3. Generate PNR (done outside lock to minimise transaction time)
        const pnr_code = await generateUniquePNR();

        // 4. Insert booking
        const [bookResult] = await conn.execute(
            `INSERT INTO bookings (passenger_id, train_id, seat_id, pnr_code, status, booking_timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
            [passenger_id, train_id, seat_id, pnr_code, status]
        );
        const booking_id = bookResult.insertId;

        // 5. If waitlisted, add to waitlist
        if (status === 'waitlisted') {
            const [posRow] = await conn.execute(
                `SELECT COALESCE(MAX(w.position), 0) + 1 AS next_pos
         FROM waitlist w JOIN bookings b ON b.id = w.booking_id
         WHERE b.train_id = ? AND b.status = 'waitlisted'`,
                [train_id]
            );
            await conn.execute(
                'INSERT INTO waitlist (booking_id, position, assigned_class) VALUES (?, ?, ?)',
                [booking_id, posRow[0].next_pos, seat_class]
            );
        }

        await conn.commit();

        return res.status(201).json({
            message: `Booking ${status}`,
            pnr_code,
            status,
            booking_id,
            seat_id,
        });
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
}

/**
 * GET /api/bookings/:pnr
 */
async function getBooking(req, res, next) {
    try {
        const booking = await bookingModel.findByPNR(req.params.pnr.toUpperCase());
        if (!booking) return next(createHttpError(404, 'Booking not found'));
        return res.json(booking);
    } catch (err) {
        next(err);
    }
}

/**
 * PUT /api/bookings/:pnr
 * Update passenger details (name, age, contact) or seat class.
 */
async function updateBooking(req, res, next) {
    const pnr = req.params.pnr.toUpperCase();
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [bookRows] = await conn.execute(
            `SELECT b.*, w.assigned_class
       FROM bookings b
       LEFT JOIN waitlist w ON w.booking_id = b.id
       WHERE b.pnr_code = ? FOR UPDATE`,
            [pnr]
        );
        if (bookRows.length === 0) {
            await conn.rollback();
            return next(createHttpError(404, 'Booking not found'));
        }
        const booking = bookRows[0];

        if (booking.status === 'cancelled') {
            await conn.rollback();
            return next(createHttpError(400, 'Cannot update a cancelled booking'));
        }

        const { name, age, contact } = req.body;
        if (name || age || contact) {
            const updates = [];
            const vals = [];
            if (name) { updates.push('name = ?'); vals.push(name); }
            if (age) { updates.push('age = ?'); vals.push(age); }
            if (contact) { updates.push('contact = ?'); vals.push(contact); }
            vals.push(booking.passenger_id);
            await conn.execute(
                `UPDATE passengers SET ${updates.join(', ')} WHERE id = ?`,
                vals
            );
        }

        await conn.commit();
        return res.json({ message: 'Booking updated', pnr });
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
}

/**
 * DELETE /api/bookings/:pnr
 * Cancel and trigger reallocation on freed seat.
 */
async function cancelBooking(req, res, next) {
    const pnr = req.params.pnr.toUpperCase();
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [bookRows] = await conn.execute(
            'SELECT * FROM bookings WHERE pnr_code = ? FOR UPDATE',
            [pnr]
        );
        if (bookRows.length === 0) {
            await conn.rollback();
            return next(createHttpError(404, 'Booking not found'));
        }
        const booking = bookRows[0];

        if (booking.status === 'cancelled') {
            await conn.rollback();
            return next(createHttpError(400, 'Booking already cancelled'));
        }

        // Mark cancelled
        await conn.execute(
            "UPDATE bookings SET status = 'cancelled' WHERE id = ?",
            [booking.id]
        );

        // If had a seat, free it
        if (booking.seat_id) {
            await conn.execute(
                'UPDATE seats SET is_available = TRUE WHERE id = ?',
                [booking.seat_id]
            );
        }

        // Remove from waitlist if applicable
        await conn.execute('DELETE FROM waitlist WHERE booking_id = ?', [booking.id]);

        await conn.commit();
        conn.release();

        // Trigger async reallocation (non-blocking)
        const { triggerOnCancellation } = require('./allocationController');
        triggerOnCancellation(booking.train_id).catch(err =>
            console.error('[Cancel] Async reallocation error:', err.message)
        );

        return res.json({ message: 'Booking cancelled successfully', pnr });
    } catch (err) {
        await conn.rollback();
        conn.release();
        next(err);
    }
}

module.exports = {
    createBooking,
    getBooking,
    updateBooking,
    cancelBooking,
    createBookingValidation,
    updateBookingValidation,
};
