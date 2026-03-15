'use strict';

const cron = require('node-cron');
const allocationController = require('../controllers/allocationController');

const CRON_EXPR = process.env.ALLOCATION_CRON || '*/15 * * * *';

function startScheduler() {
    cron.schedule(CRON_EXPR, async () => {
        console.log('[Scheduler] Running periodic seat-reallocation sweep...');
        try {
            // Get all train IDs that have active waitlisted bookings
            const pool = require('./db');
            const [trains] = await pool.execute(`
        SELECT DISTINCT b.train_id
        FROM bookings b
        JOIN waitlist w ON w.booking_id = b.id
        WHERE b.status = 'waitlisted'
      `);

            for (const { train_id } of trains) {
                try {
                    const result = await allocationController.runReallocation(train_id);
                    if (result.reallocated > 0) {
                        console.log(
                            `[Scheduler] Train ${train_id}: reallocated=${result.reallocated} remaining=${result.remaining_waitlist}`
                        );
                    }
                } catch (err) {
                    console.error(`[Scheduler] Error on train ${train_id}:`, err.message);
                }
            }
        } catch (err) {
            console.error('[Scheduler] Fatal sweep error:', err.message);
        }
    });

    console.log(`[Scheduler] Reallocation cron started: "${CRON_EXPR}"`);
}

module.exports = { startScheduler };
