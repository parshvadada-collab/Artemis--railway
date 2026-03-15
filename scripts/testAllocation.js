'use strict';
/**
 * testAllocation.js
 * Seeds a train with 10 confirmed + 5 waitlisted bookings,
 * cancels 3 confirmed bookings, triggers reallocation,
 * and asserts the correct 3 waitlisted passengers are promoted in priority order.
 *
 * Run: node scripts/testAllocation.js
 */

require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');
const { computeScore } = require('../backend/controllers/allocationController');

let conn;
let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ ${message}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        failed++;
    }
}

async function clean(trainId) {
    await conn.execute('DELETE FROM waitlist  WHERE booking_id IN (SELECT id FROM bookings WHERE train_id = ?)', [trainId]);
    await conn.execute('DELETE FROM bookings  WHERE train_id = ?', [trainId]);
    await conn.execute('DELETE FROM seats     WHERE train_id = ?', [trainId]);
    await conn.execute('DELETE FROM trains    WHERE id = ?', [trainId]);
}

async function main() {
    conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'railway_db',
    });

    console.log('\n══════════════════════════════════════════════════');
    console.log(' Railway Allocation Engine — Integration Test');
    console.log('══════════════════════════════════════════════════\n');

    // 1. Create a test train
    const dep = new Date(); dep.setDate(dep.getDate() + 5);
    const arr = new Date(dep); arr.setHours(arr.getHours() + 10);

    const [trainRes] = await conn.execute(
        `INSERT INTO trains (train_number, source, destination, departure_time, arrival_time, distance_km, total_seats)
     VALUES ('TEST9999', 'TestCity', 'EndCity', ?, ?, 500, 10)`,
        [dep.toISOString().slice(0, 19).replace('T', ' '), arr.toISOString().slice(0, 19).replace('T', ' ')]
    );
    const trainId = trainRes.insertId;
    console.log(`[Setup] Created test train ID=${trainId}`);

    // 2. Create 10 seats
    const seatIds = [];
    for (let i = 1; i <= 10; i++) {
        const [sr] = await conn.execute(
            "INSERT INTO seats (train_id, seat_number, class, is_available) VALUES (?, ?, 'SL', TRUE)",
            [trainId, `SL-${i}`]
        );
        seatIds.push(sr.insertId);
    }
    console.log(`[Setup] Created ${seatIds.length} seats`);

    // 3. Create 10 confirmed bookings (each occupies a seat)
    const confirmedBookingIds = [];
    for (let i = 0; i < 10; i++) {
        const [pr] = await conn.execute(
            'INSERT INTO passengers (name, age, contact) VALUES (?, ?, ?)',
            [`ConfirmedPass_${i + 1}`, 25 + i, `99900000${i}`]
        );
        const passId = pr.insertId;

        await conn.execute('UPDATE seats SET is_available = FALSE WHERE id = ?', [seatIds[i]]);
        const [br] = await conn.execute(
            `INSERT INTO bookings (passenger_id, train_id, seat_id, pnr_code, status, booking_timestamp)
       VALUES (?, ?, ?, ?, 'confirmed', NOW())`,
            [passId, trainId, seatIds[i], `TPNR${String(i).padStart(6, '0')}`]
        );
        confirmedBookingIds.push({ bookingId: br.insertId, seatId: seatIds[i] });
    }
    console.log('[Setup] Created 10 confirmed bookings');

    // 4. Create 5 waitlisted bookings
    const waitlistBookingIds = [];
    for (let i = 0; i < 5; i++) {
        const [pr] = await conn.execute(
            'INSERT INTO passengers (name, age, contact) VALUES (?, ?, ?)',
            [`WaitPass_${i + 1}`, 30 + i, `98800000${i}`]
        );
        const passId = pr.insertId;
        const [br] = await conn.execute(
            `INSERT INTO bookings (passenger_id, train_id, seat_id, pnr_code, status,
         booking_timestamp)
       VALUES (?, ?, NULL, ?, 'waitlisted', DATE_SUB(NOW(), INTERVAL ? DAY))`,
            [passId, trainId, `WPNR${String(i).padStart(6, '0')}`, i + 1]
        );
        const bookingId = br.insertId;
        await conn.execute(
            'INSERT INTO waitlist (booking_id, position, assigned_class) VALUES (?, ?, ?)',
            [bookingId, i + 1, 'SL']
        );
        waitlistBookingIds.push(bookingId);
    }
    console.log('[Setup] Created 5 waitlisted bookings\n');

    // 5. Verify initial state
    const [initW] = await conn.execute(
        "SELECT COUNT(*) AS cnt FROM bookings WHERE train_id = ? AND status = 'waitlisted'",
        [trainId]
    );
    assert(initW[0].cnt === 5, 'Initial waitlist count = 5');

    // 6. Cancel 3 confirmed bookings and free seats
    const toCancel = confirmedBookingIds.slice(0, 3);
    for (const { bookingId, seatId } of toCancel) {
        await conn.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [bookingId]);
        await conn.execute('UPDATE seats SET is_available = TRUE WHERE id = ?', [seatId]);
    }
    console.log('\n[Test] Cancelled 3 confirmed bookings — 3 seats freed');

    const [afterFree] = await conn.execute(
        'SELECT COUNT(*) AS cnt FROM seats WHERE train_id = ? AND is_available = TRUE',
        [trainId]
    );
    assert(afterFree[0].cnt === 3, '3 seats available after cancellations');

    // 7. Run reallocation
    const allocationController = require('../backend/controllers/allocationController');
    console.log('\n[Test] Running reallocation...');
    const result = await allocationController.runReallocation(trainId);

    assert(result.reallocated === 3, `Reallocated exactly 3 passengers (got ${result.reallocated})`);
    assert(result.remaining_waitlist === 2, `Remaining waitlist = 2 (got ${result.remaining_waitlist})`);
    assert(result.actions.length === 3, `3 actions logged`);

    // 8. Verify promoted passengers are now confirmed
    const promotedIds = result.actions.map(a => a.booking_id);
    const [promotedRows] = await conn.execute(
        `SELECT id, status FROM bookings WHERE id IN (${promotedIds.join(',')})`,
    );
    for (const row of promotedRows) {
        assert(row.status === 'confirmed', `Booking ${row.id} status = confirmed`);
    }

    // 9. Verify priority order (lower position → higher rank)
    const positions = result.actions.map(a => a.waitlist_position);
    const sorted = [...positions].sort((a, b) => a - b);
    assert(
        JSON.stringify(positions) === JSON.stringify(sorted),
        `Reallocation order follows waitlist priority (positions: ${positions.join(',')})`
    );

    // 10. Verify waitlisted seats are unset
    for (const a of result.actions) {
        assert(a.seat_id !== null, `Action booking_id=${a.booking_id} has seat_id assigned`);
    }

    // 11. Test priority scoring formula directly
    console.log('\n[Unit] Testing computeScore...');
    const s1 = computeScore({ position: 1, assigned_class: 'SL', days_since_booking: 2, demand_signal: 0.5 }, 'SL');
    const s2 = computeScore({ position: 5, assigned_class: 'SL', days_since_booking: 2, demand_signal: 0.5 }, 'SL');
    assert(s1.score > s2.score, `Position 1 scores higher than position 5 (${s1.score.toFixed(4)} > ${s2.score.toFixed(4)})`);

    const upgrade = computeScore({ position: 1, assigned_class: 'SL', days_since_booking: 2, demand_signal: 0.5 }, '2A');
    const sameClass = computeScore({ position: 1, assigned_class: 'SL', days_since_booking: 2, demand_signal: 0.5 }, 'SL');
    assert(sameClass.score > upgrade.score, `Exact class match scores higher than upgrade`);

    // Cleanup
    await clean(trainId);
    await conn.end();

    console.log('\n══════════════════════════════════════════════════');
    console.log(` Results: ${passed} passed, ${failed} failed`);
    console.log('══════════════════════════════════════════════════\n');

    if (failed > 0) process.exit(1);
}

main().catch(err => { console.error('[Fatal]', err); process.exit(1); });
