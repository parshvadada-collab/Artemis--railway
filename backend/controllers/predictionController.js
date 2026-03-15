const axios = require('axios');
const pool = require('../utils/db');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:5002';

exports.getPrediction = async (req, res) => {
  try {
    const { pnr } = req.params;

    // Fetch booking details from DB
    const [bookings] = await pool.query(
      `SELECT b.*, w.position as waitlist_position, t.departure_time, t.arrival_time
       FROM bookings b
       LEFT JOIN waitlist w ON w.booking_id = b.id
       LEFT JOIN trains t ON t.id = b.train_id
       WHERE b.pnr_code = ?`,
      [pnr]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'PNR not found' });
    }

    const booking = bookings[0];

    if (booking.status === 'confirmed') {
      return res.json({
        pnr,
        status: 'confirmed',
        confirmation_probability: 1.0,
        confidence: 'high',
        label: 'already confirmed'
      });
    }

    const departureDate = new Date(booking.departure_time);
    const today = new Date();
    const daysToDepart = Math.ceil((departureDate - today) / (1000 * 60 * 60 * 24));
    const month = departureDate.getMonth() + 1;
    const dayOfWeek = departureDate.getDay();

    const seasonMap = { 1:1,2:1,3:0,4:2,5:2,6:0,7:0,8:0,9:0,10:3,11:3,12:3 };
    const classMap = { SL:0, '3A':1, '2A':2, '1A':3 };
    const holidays = [[1,26],[8,15],[10,2],[12,25],[4,14],[5,1]];
    const isHoliday = holidays.some(
      ([m,d]) => m === departureDate.getMonth()+1 && d === departureDate.getDate()
    ) ? 1 : 0;

    const features = {
      waitlist_position:    booking.waitlist_position || 1,
      days_to_departure:    Math.max(daysToDepart, 1),
      booking_class_ordinal: classMap[booking.seat_class || booking.class] ?? 0,
      season_ordinal:       seasonMap[month] ?? 0,
      day_of_week:          dayOfWeek,
      is_holiday:           isHoliday,
      special_event:        0,
      historical_fill_rate: 0.80,
      recent_cancel_rate:   0.08,
      duration_hours:       Math.max(1, Math.round((new Date(booking.arrival_time) - new Date(booking.departure_time)) / (1000 * 60 * 60)))
    };

    // Call Flask ML service
    const mlResponse = await axios.post(`${ML_URL}/predict`, features);

    return res.json({
      pnr,
      status: booking.status,
      ...mlResponse.data
    });

  } catch (err) {
    console.error('Prediction error:', err.message);
    return res.status(500).json({ error: 'Prediction service unavailable' });
  }
};
