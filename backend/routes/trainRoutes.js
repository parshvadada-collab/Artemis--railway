const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

router.get('/search', async (req, res) => {
  const { source, destination, date, class: seatClass, quota } = req.query;
  try {
    let seatFilterQuery = 's.is_available = TRUE';
    const params = [source, destination, date];
    if (seatClass) {
        seatFilterQuery += ' AND s.class = ?';
        params.push(seatClass);
    }

    const [trains] = await pool.query(
      `SELECT t.id, t.train_number, t.train_name, t.source, t.destination,
              t.departure_time, t.arrival_time,
              t.base_fare_sl, t.base_fare_3a, t.base_fare_2a, t.base_fare_1a,
              COUNT(s.id) as available_seats
       FROM trains t
       LEFT JOIN seats s ON s.train_id = t.id AND ${seatFilterQuery}
       WHERE t.source = ? AND t.destination = ?
         AND DATE(CONVERT_TZ(t.departure_time, '+00:00', '+05:30')) = ?
       GROUP BY t.id`,
      params
    );

    // Simulate quota seat availability limits since we don't have separate physical quota tables in this demo
    // GN: Full seats, TQ: ~20 max, LD: ~6 max, PT: ~10 max
    const simulatedTrains = trains.map(t => {
      let avbl = parseInt(t.available_seats) || 0;
      if (quota === 'TQ') avbl = Math.min(avbl, 20);
      else if (quota === 'PT') avbl = Math.min(avbl, 10);
      else if (quota === 'LD') avbl = Math.min(avbl, 6);
      return { ...t, available_seats: avbl };
    });

    res.json({ trains: simulatedTrains });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
