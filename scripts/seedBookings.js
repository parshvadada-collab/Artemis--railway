'use strict';
require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

async function seedBookings() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'railway_management'
    });

    // 1. Get a train
    const [trains] = await conn.execute("SELECT id FROM trains LIMIT 1");
    if (trains.length === 0) return;
    const trainId = trains[0].id;

    // 2. Create passenger
    const [pRes] = await conn.execute("INSERT INTO passengers (name, age, contact) VALUES ('John Doe', 30, '1234567890')");
    const passengerId = pRes.insertId;

    // 3. Create waitlisted booking
    const pnr = `WLT${Math.floor(Math.random() * 1000000)}`;
    const [bRes] = await conn.execute(
        "INSERT INTO bookings (passenger_id, train_id, pnr_code, status) VALUES (?, ?, ?, 'waitlisted')",
        [passengerId, trainId, pnr]
    );
    const bookingId = bRes.insertId;

    // 4. Create waitlist entry
    await conn.execute(
        "INSERT INTO waitlist (booking_id, position, assigned_class) VALUES (?, 1, 'SL')",
        [bookingId]
    );

    console.log(`Created Waitlisted PNR: ${pnr}`);
    await conn.end();
}

seedBookings().catch(console.error);
