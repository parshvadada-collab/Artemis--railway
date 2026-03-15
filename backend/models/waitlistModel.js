'use strict';

const pool = require('../utils/db');

async function add(conn, bookingId, position, assignedClass) {
    await conn.execute(
        'INSERT INTO waitlist (booking_id, position, assigned_class) VALUES (?, ?, ?)',
        [bookingId, position, assignedClass]
    );
}

async function remove(conn, bookingId) {
    await conn.execute('DELETE FROM waitlist WHERE booking_id = ?', [bookingId]);
}

async function getNextPosition(trainId) {
    const [rows] = await pool.execute(
        `SELECT COALESCE(MAX(w.position), 0) + 1 AS next_pos
     FROM waitlist w
     JOIN bookings b ON b.id = w.booking_id
     WHERE b.train_id = ? AND b.status = 'waitlisted'`,
        [trainId]
    );
    return rows[0].next_pos;
}

async function countByTrain(trainId) {
    const [rows] = await pool.execute(
        `SELECT COUNT(*) AS cnt
     FROM waitlist w
     JOIN bookings b ON b.id = w.booking_id
     WHERE b.train_id = ? AND b.status = 'waitlisted'`,
        [trainId]
    );
    return rows[0].cnt;
}

module.exports = { add, remove, getNextPosition, countByTrain };
