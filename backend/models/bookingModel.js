'use strict';

const pool = require('../utils/db');

async function findByPNR(pnr) {
    const [rows] = await pool.execute(
        `SELECT b.*, p.name AS passenger_name, p.age, p.contact,
            t.train_number, t.source, t.destination,
            t.departure_time, t.arrival_time,
            s.seat_number, s.class AS seat_class,
            w.position AS waitlist_position
     FROM bookings b
     JOIN passengers p ON p.id = b.passenger_id
     JOIN trains     t ON t.id = b.train_id
     LEFT JOIN seats s ON s.id = b.seat_id
     LEFT JOIN waitlist w ON w.booking_id = b.id
     WHERE b.pnr_code = ?`,
        [pnr]
    );
    return rows[0] || null;
}

async function findById(id) {
    const [rows] = await pool.execute(
        'SELECT * FROM bookings WHERE id = ?',
        [id]
    );
    return rows[0] || null;
}

async function create({ passenger_id, train_id, seat_id, pnr_code, status }) {
    const [result] = await pool.execute(
        `INSERT INTO bookings (passenger_id, train_id, seat_id, pnr_code, status, booking_timestamp)
     VALUES (?, ?, ?, ?, ?, NOW())`,
        [passenger_id, train_id, seat_id ?? null, pnr_code, status]
    );
    return result.insertId;
}

async function update(pnr, fields) {
    const allowed = ['status', 'seat_id'];
    const setClauses = [];
    const values = [];
    for (const key of allowed) {
        if (fields[key] !== undefined) {
            setClauses.push(`${key} = ?`);
            values.push(fields[key]);
        }
    }
    if (setClauses.length === 0) return 0;
    values.push(pnr);
    const [result] = await pool.execute(
        `UPDATE bookings SET ${setClauses.join(', ')} WHERE pnr_code = ?`,
        values
    );
    return result.affectedRows;
}

async function cancel(pnr) {
    const [result] = await pool.execute(
        `UPDATE bookings SET status = 'cancelled' WHERE pnr_code = ? AND status != 'cancelled'`,
        [pnr]
    );
    return result.affectedRows;
}

async function getWaitlistByTrain(trainId) {
    const [rows] = await pool.execute(
        `SELECT b.id AS booking_id, b.seat_id, p.name,
            w.position, w.assigned_class,
            b.booking_timestamp,
            DATEDIFF(t.departure_time, NOW()) AS days_to_departure
     FROM waitlist w
     JOIN bookings  b ON b.id = w.booking_id
     JOIN passengers p ON p.id = b.passenger_id
     JOIN trains    t ON t.id = b.train_id
     WHERE b.train_id = ? AND b.status = 'waitlisted'
     ORDER BY w.position ASC`,
        [trainId]
    );
    return rows;
}

module.exports = { findByPNR, findById, create, update, cancel, getWaitlistByTrain };
