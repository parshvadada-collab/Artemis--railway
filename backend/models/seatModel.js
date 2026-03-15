'use strict';

const pool = require('../utils/db');

async function getAvailableSeats(trainId, seatClass = null) {
    let sql = `SELECT * FROM seats WHERE train_id = ? AND is_available = TRUE`;
    const params = [trainId];
    if (seatClass) {
        sql += ` AND class = ?`;
        params.push(seatClass);
    }
    sql += ` ORDER BY seat_number ASC`;
    const [rows] = await pool.execute(sql, params);
    return rows;
}

async function markUnavailable(conn, seatId) {
    await conn.execute(
        'UPDATE seats SET is_available = FALSE WHERE id = ?',
        [seatId]
    );
}

async function markAvailable(conn, seatId) {
    await conn.execute(
        'UPDATE seats SET is_available = TRUE WHERE id = ?',
        [seatId]
    );
}

async function lockSeatForUpdate(conn, seatId) {
    const [rows] = await conn.execute(
        'SELECT * FROM seats WHERE id = ? AND is_available = TRUE FOR UPDATE',
        [seatId]
    );
    return rows[0] || null;
}

async function getTotalSeats(trainId) {
    const [rows] = await pool.execute(
        'SELECT COUNT(*) AS total FROM seats WHERE train_id = ?',
        [trainId]
    );
    return rows[0].total;
}

module.exports = { getAvailableSeats, markUnavailable, markAvailable, lockSeatForUpdate, getTotalSeats };
