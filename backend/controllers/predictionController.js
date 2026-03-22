'use strict';

const axios = require('axios');
const pool  = require('../utils/db');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:5002';

// ── helpers ───────────────────────────────────────────────────────────────────
const CLASS_MAP   = { SL: 0, '3A': 1, '2A': 2, '1A': 3 };
const SEASON_MAP  = { 1:1,2:1,3:0,4:2,5:2,6:0,7:0,8:0,9:0,10:3,11:3,12:3 };  // 0=off,1=winter,2=summer,3=festive
const SEASON_LABEL = { 0:'Off-Season', 1:'Winter Season', 2:'Summer Peak', 3:'Festive Season' };
const HOLIDAYS = [[1,26],[8,15],[10,2],[12,25],[4,14],[5,1]];
const QUOTA_TYPES = ['GNWL','RLWL','TQWL','PQWL'];

/** deterministic quota from PNR prefix for demo purposes */
function deriveQuota(pnr, source) {
  const code = (pnr || '').slice(0,2).toUpperCase();
  if (code === 'WL') return 'GNWL';
  const srcHash = (source || '').charCodeAt(0) % 4;
  return QUOTA_TYPES[srcHash];
}

/** build human-readable factors that explain the probability */
function buildFactors(features, booking) {
  const factors = [];
  const wl = features.waitlist_position;
  const dtd = features.days_to_departure;

  // Waitlist position factor
  if (wl <= 3)       factors.push({ icon:'🟢', label:'Low Waitlist Position', detail:`#${wl} — very few ahead of you`, impact:'positive' });
  else if (wl <= 10) factors.push({ icon:'🟡', label:'Moderate Waitlist',     detail:`#${wl} — decent chance of confirmation`, impact:'neutral'  });
  else               factors.push({ icon:'🔴', label:'High Waitlist Position', detail:`#${wl} — many tickets ahead`, impact:'negative' });

  // Days to departure
  if (dtd >= 30)    factors.push({ icon:'🟢', label:'Ample Time to Departure', detail:`${dtd} days away — cancellations likely`, impact:'positive' });
  else if (dtd >= 7) factors.push({ icon:'🟡', label:'Moderate Time Window',   detail:`${dtd} days — moderate cancellation chance`, impact:'neutral'  });
  else               factors.push({ icon:'🔴', label:'Departure Soon',          detail:`${dtd} day(s) — cancellations unlikely now`, impact:'negative' });

  // Season
  const seasonLabel = SEASON_LABEL[features.season_ordinal] || 'Normal Season';
  const seasonImpact = features.season_ordinal >= 2 ? 'negative' : features.season_ordinal === 0 ? 'positive' : 'neutral';
  factors.push({ icon: seasonImpact === 'positive' ? '🟢' : seasonImpact === 'negative' ? '🔴' : '🟡',
    label: seasonLabel, detail: seasonImpact === 'negative' ? 'Peak season — trains are fuller' : 'Lower demand period', impact: seasonImpact });

  // Holiday
  if (features.is_holiday) factors.push({ icon:'🔴', label:'Holiday Travel', detail:'National holiday — very high demand', impact:'negative' });

  // Class
  const classImpact = features.booking_class_ordinal >= 2 ? 'positive' : 'neutral';
  const classNames = ['SL (Sleeper)','3A (AC 3 Tier)','2A (AC 2 Tier)','1A (AC First)'];
  factors.push({ icon: classImpact === 'positive' ? '🟢' : '🟡',
    label: classNames[features.booking_class_ordinal] || 'Sleeper Class',
    detail: classImpact === 'positive' ? 'AC classes have lower demand' : 'Sleeper is highest demand class',
    impact: classImpact });

  // Historical fill rate
  if (features.historical_fill_rate < 0.70)
    factors.push({ icon:'🟢', label:'Route Has Free Capacity', detail:'Historical fill rate below 70%', impact:'positive' });
  else if (features.historical_fill_rate > 0.90)
    factors.push({ icon:'🔴', label:'Route Is Near Full',      detail:'Historical fill rate above 90%', impact:'negative' });

  return factors;
}

exports.getPrediction = async (req, res) => {
  try {
    const { pnr } = req.params;

    // ── 1. Fetch rich booking details ─────────────────────────────────────────
    const [bookings] = await pool.query(
      `SELECT 
          b.*,
          p.name AS passenger_name, p.age, p.contact,
          w.position AS waitlist_position, w.assigned_class,
          t.train_number, t.train_name,
          t.source, t.destination,
          t.departure_time, t.arrival_time,
          t.base_fare_sl, t.base_fare_3a, t.base_fare_2a, t.base_fare_1a
       FROM bookings b
       JOIN passengers p ON p.id = b.passenger_id
       JOIN trains t ON t.id = b.train_id
       LEFT JOIN waitlist w ON w.booking_id = b.id
       WHERE b.pnr_code = ?`,
      [pnr.toUpperCase()]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'PNR not found. Please check your PNR code.' });
    }

    const b = bookings[0];
    const seatClass = b.seat_class || b.assigned_class || 'SL';

    // ── 2. Confirmed short-circuit ────────────────────────────────────────────
    if (b.status === 'confirmed') {
      return res.json({
        pnr: pnr.toUpperCase(),
        status: 'confirmed',
        confirmation_probability: 1.0,
        confidence: 'high',
        label: 'already confirmed',
        // Booking metadata
        passenger_name:  b.passenger_name,
        train_number:    b.train_number,
        train_name:      b.train_name,
        source:          b.source,
        destination:     b.destination,
        departure_time:  b.departure_time,
        arrival_time:    b.arrival_time,
        seat_class:      seatClass,
        waitlist_position: null,
        quota:           deriveQuota(pnr, b.source),
        days_to_departure: Math.max(0, Math.ceil((new Date(b.departure_time) - new Date()) / 864e5)),
        booking_timestamp: b.booking_timestamp,
        factors: [{ icon:'✅', label:'Seat Confirmed', detail:'Your seat has been successfully allocated', impact:'positive' }],
      });
    }

    // ── 3. Build ML features ──────────────────────────────────────────────────
    const departureDate = new Date(b.departure_time);
    const today = new Date();
    const daysToDepart = Math.max(1, Math.ceil((departureDate - today) / 864e5));
    const month = departureDate.getMonth() + 1;
    const dayOfWeek = departureDate.getDay();
    const isHoliday = HOLIDAYS.some(([m,d]) => m === month && d === departureDate.getDate()) ? 1 : 0;
    const durationHours = Math.max(1, Math.round((new Date(b.arrival_time) - departureDate) / 36e5));

    const features = {
      waitlist_position:     b.waitlist_position || 1,
      days_to_departure:     daysToDepart,
      booking_class_ordinal: CLASS_MAP[seatClass] ?? 0,
      season_ordinal:        SEASON_MAP[month] ?? 0,
      day_of_week:           dayOfWeek,
      is_holiday:            isHoliday,
      special_event:         0,
      historical_fill_rate:  0.80,
      recent_cancel_rate:    0.08,
      duration_hours:        durationHours,
    };

    // ── 4. Call ML service ────────────────────────────────────────────────────
    const mlResponse = await axios.post(`${ML_URL}/predict`, features, { timeout: 5000 });
    const ml = mlResponse.data;

    // ── 5. Return enriched response ────────────────────────────────────────────
    return res.json({
      pnr: pnr.toUpperCase(),
      status: b.status,
      // ML output
      confirmation_probability: ml.confirmation_probability,
      confidence:               ml.confidence,
      label:                    ml.label,
      // Booking metadata
      passenger_name:    b.passenger_name,
      train_number:      b.train_number,
      train_name:        b.train_name,
      source:            b.source,
      destination:       b.destination,
      departure_time:    b.departure_time,
      arrival_time:      b.arrival_time,
      seat_class:        seatClass,
      waitlist_position: b.waitlist_position,
      quota:             deriveQuota(pnr, b.source),
      days_to_departure: daysToDepart,
      booking_timestamp: b.booking_timestamp,
      // Explainable AI factors
      factors: buildFactors(features, b),
      // Raw features for audit
      ml_features: features,
    });

  } catch (err) {
    console.error('[Prediction] Error:', err.message);
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      return res.status(503).json({ error: 'ML prediction service is unavailable. Please try again shortly.' });
    }
    return res.status(500).json({ error: err.message || 'Prediction failed' });
  }
};
