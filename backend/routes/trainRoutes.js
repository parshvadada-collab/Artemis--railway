const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

router.get('/search', async (req, res) => {
  const { source, destination, date } = req.query;
  try {
    const [trains] = await pool.query(
      `SELECT t.id, t.train_number, t.source, t.destination,
              t.departure_time, t.arrival_time,
              COUNT(s.id) as available_seats
       FROM trains t
       LEFT JOIN seats s ON s.train_id = t.id AND s.is_available = TRUE
       WHERE t.source = ? AND t.destination = ?
         AND DATE(CONVERT_TZ(t.departure_time, '+00:00', '+05:30')) = ?
       GROUP BY t.id`,
      [source, destination, date]
    );
    res.json({ trains });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
