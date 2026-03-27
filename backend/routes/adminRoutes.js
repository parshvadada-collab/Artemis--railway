const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { authMiddleware, requireRole } = require('../middlewares/authMiddleware');

router.use(authMiddleware, requireRole('admin'));

// GET /api/admin/stats — returns total bookings, confirmed count, waitlisted count, cancelled count, total revenue
router.get('/stats', async (req, res) => {
    try {
        const [[stats]] = await pool.query(`
            SELECT 
                COUNT(*) as "totalBookings",
                SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) as "confirmedCount",
                SUM(CASE WHEN b.status = 'waitlisted' THEN 1 ELSE 0 END) as "waitlistedCount",
                SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as "cancelledCount",
                SUM(
                    CASE WHEN b.status != 'cancelled' THEN 
                        CASE s.class 
                            WHEN 'SL' THEN t.base_fare_sl
                            WHEN '3A' THEN t.base_fare_3a
                            WHEN '2A' THEN t.base_fare_2a
                            WHEN '1A' THEN t.base_fare_1a
                            ELSE 0 
                        END
                    ELSE 0 END
                ) as "totalRevenue"
            FROM bookings b
            JOIN trains t ON b.train_id = t.id
            LEFT JOIN seats s ON b.seat_id = s.id
        `);

        // fallback revenue to 0 if null
        res.json({
            ...stats,
            totalRevenue: stats.totalRevenue || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/routes — returns top 5 busiest routes with booking count
router.get('/routes', async (req, res) => {
    try {
        const [routes] = await pool.query(`
            SELECT 
                CONCAT(t.source, ' → ', t.destination) AS "routeName",
                COUNT(b.id) AS "bookingCount"
            FROM bookings b
            JOIN trains t ON b.train_id = t.id
            GROUP BY t.source, t.destination
            ORDER BY "bookingCount" DESC
            LIMIT 5
        `);
        res.json(routes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/trains — returns each train with seat utilization percentage
router.get('/trains', async (req, res) => {
    try {
        const [trains] = await pool.query(`
            SELECT 
                t.train_number as "trainNumber",
                t.train_name as "trainName",
                t.total_seats as "totalSeats",
                COUNT(s.id) as "availableSeats",
                ROUND(((t.total_seats - COUNT(s.id))::decimal / t.total_seats) * 100, 2) as utilization
            FROM trains t
            LEFT JOIN seats s ON s.train_id = t.id AND s.is_available = TRUE
            GROUP BY t.id
        `);
        // handle percentage fallback
        const result = trains.map(t => ({
            ...t,
            utilization: t.utilization === null ? 100 : t.utilization
        }));
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/recent — returns last 10 bookings with passenger name, PNR, status, train name, route
router.get('/recent', async (req, res) => {
    try {
        const [bookings] = await pool.query(`
            SELECT 
                b.pnr_code as pnr,
                p.name as "passengerName",
                b.status as status,
                t.train_name as "trainName",
                CONCAT(t.source, ' → ', t.destination) as route,
                s.class as class
            FROM bookings b
            JOIN passengers p ON b.passenger_id = p.id
            JOIN trains t ON b.train_id = t.id
            LEFT JOIN seats s ON b.seat_id = s.id
            ORDER BY b.booking_timestamp DESC
            LIMIT 10
        `);
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/waitlist — returns waitlist length per train
router.get('/waitlist', async (req, res) => {
    try {
        const [waitlist] = await pool.query(`
            SELECT 
                t.train_name as "trainName",
                t.train_number as "trainNumber",
                COUNT(w.id) as "waitlistCount"
            FROM waitlist w
            JOIN bookings b ON w.booking_id = b.id
            JOIN trains t ON b.train_id = t.id
            GROUP BY t.id
            ORDER BY "waitlistCount" DESC
        `);
        res.json(waitlist);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
