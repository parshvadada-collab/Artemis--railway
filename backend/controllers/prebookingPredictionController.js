'use strict';

const axios = require('axios');
const pool = require('../utils/db');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:5002';
const CLASS_MAP = { SL: 0, '3A': 1, '2A': 2, '1A': 3 };
const SEASON_MAP = { 1: 1, 2: 1, 3: 0, 4: 2, 5: 2, 6: 0, 7: 0, 8: 0, 9: 0, 10: 3, 11: 3, 12: 3 };
const SEASON_LABEL = { 0: 'Off-Season', 1: 'Winter Season', 2: 'Summer Peak', 3: 'Festive Season' };
const HOLIDAYS = [[1, 26], [8, 15], [10, 2], [12, 25], [4, 14], [5, 1]];
const SUPPORTED_CLASSES = Object.keys(CLASS_MAP);
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DEFAULT_FILL_RATE = 0.8;
const DEFAULT_CANCEL_RATE = 0.08;

function parseDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function getDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getDaysToDeparture(departureTime) {
  const departure = new Date(departureTime);
  const today = new Date();
  return Math.max(1, Math.ceil((departure - today) / 864e5));
}

function getDurationHours(departureTime, arrivalTime) {
  const departure = new Date(departureTime);
  const arrival = new Date(arrivalTime);
  return Math.max(1, Math.round((arrival - departure) / 36e5));
}

function isHolidayDate(date) {
  return HOLIDAYS.some(([month, day]) => month === date.getMonth() + 1 && day === date.getDate()) ? 1 : 0;
}

function getAvailabilityStatus(availableSeats) {
  if (availableSeats > 20) return 'available';
  if (availableSeats > 0) return 'limited';
  return 'waitlist';
}

function getSurgeMultiplier(availableSeats) {
  if (availableSeats > 20) return 1.0;
  if (availableSeats >= 10) return 1.15;
  if (availableSeats >= 1) return 1.3;
  return 1.45;
}

function estimateWaitlistPosition(availableSeats) {
  if (availableSeats > 20) return 1;
  if (availableSeats >= 10) return 5;
  if (availableSeats >= 1) return 15;
  return 30;
}

function getFareForClass(train, seatClass) {
  const fareField = {
    SL: 'base_fare_sl',
    '3A': 'base_fare_3a',
    '2A': 'base_fare_2a',
    '1A': 'base_fare_1a',
  }[seatClass];

  const fare = fareField ? Number(train[fareField]) : NaN;
  return Number.isFinite(fare) && fare > 0 ? fare : null;
}

function buildFeatures({ waitlistPosition, departureTime, arrivalTime, seatClass, historicalFillRate }) {
  const departure = new Date(departureTime);
  const month = departure.getMonth() + 1;

  return {
    waitlist_position: waitlistPosition,
    days_to_departure: getDaysToDeparture(departureTime),
    booking_class_ordinal: CLASS_MAP[seatClass] ?? 0,
    season_ordinal: SEASON_MAP[month] ?? 0,
    day_of_week: departure.getDay(),
    is_holiday: isHolidayDate(departure),
    special_event: 0,
    historical_fill_rate: historicalFillRate,
    recent_cancel_rate: DEFAULT_CANCEL_RATE,
    duration_hours: getDurationHours(departureTime, arrivalTime),
  };
}

function buildFactors(features) {
  const factors = [];
  const waitlistPosition = features.waitlist_position;
  const daysToDeparture = features.days_to_departure;

  if (waitlistPosition <= 3) {
    factors.push({ icon: '🟢', label: 'Low Waitlist Estimate', detail: `Estimated WL ${waitlistPosition} keeps you near the front of the queue.`, impact: 'positive' });
  } else if (waitlistPosition <= 10) {
    factors.push({ icon: '🟡', label: 'Moderate Waitlist Estimate', detail: `Estimated WL ${waitlistPosition} gives you a decent shot if cancellations happen.`, impact: 'neutral' });
  } else {
    factors.push({ icon: '🔴', label: 'Heavy Waitlist Estimate', detail: `Estimated WL ${waitlistPosition} means many passengers are still ahead.`, impact: 'negative' });
  }

  if (daysToDeparture >= 30) {
    factors.push({ icon: '🟢', label: 'Long Booking Window', detail: `${daysToDeparture} days remain before departure, leaving more room for cancellations.`, impact: 'positive' });
  } else if (daysToDeparture >= 7) {
    factors.push({ icon: '🟡', label: 'Moderate Time Window', detail: `${daysToDeparture} days remain before travel.`, impact: 'neutral' });
  } else {
    factors.push({ icon: '🔴', label: 'Departure Is Close', detail: `${daysToDeparture} day(s) remain, so the queue has less time to move.`, impact: 'negative' });
  }

  const seasonLabel = SEASON_LABEL[features.season_ordinal] || 'Normal Season';
  const seasonImpact = features.season_ordinal >= 2 ? 'negative' : features.season_ordinal === 0 ? 'positive' : 'neutral';
  factors.push({
    icon: seasonImpact === 'positive' ? '🟢' : seasonImpact === 'negative' ? '🔴' : '🟡',
    label: seasonLabel,
    detail: seasonImpact === 'negative' ? 'Seasonal demand is usually high on this date.' : 'Seasonal demand is more balanced for this date.',
    impact: seasonImpact,
  });

  if (features.day_of_week === 5 || features.day_of_week === 6) {
    factors.push({ icon: '🔴', label: 'Weekend Pressure', detail: `${DAY_LABELS[features.day_of_week]} departures usually see heavier crowding.`, impact: 'negative' });
  } else if (features.day_of_week >= 1 && features.day_of_week <= 3) {
    factors.push({ icon: '🟢', label: 'Midweek Advantage', detail: `${DAY_LABELS[features.day_of_week]} travel is often easier than weekend travel.`, impact: 'positive' });
  } else {
    factors.push({ icon: '🟡', label: 'Steady Day Demand', detail: `${DAY_LABELS[features.day_of_week]} demand is usually stable on this route.`, impact: 'neutral' });
  }

  if (features.is_holiday) {
    factors.push({ icon: '🔴', label: 'Holiday Demand', detail: 'The travel date lands on a holiday, which usually reduces flexibility.', impact: 'negative' });
  }

  const classImpact = features.booking_class_ordinal >= 2 ? 'positive' : 'neutral';
  const classNames = ['SL (Sleeper)', '3A (AC 3 Tier)', '2A (AC 2 Tier)', '1A (AC First)'];
  factors.push({
    icon: classImpact === 'positive' ? '🟢' : '🟡',
    label: classNames[features.booking_class_ordinal] || 'Sleeper Class',
    detail: classImpact === 'positive' ? 'Upper AC classes usually face lighter demand than Sleeper.' : 'Sleeper demand tends to move faster and fill sooner.',
    impact: classImpact,
  });

  if (features.historical_fill_rate < 0.7) {
    factors.push({ icon: '🟢', label: 'Route Has Headroom', detail: 'Historic fill rate is below 70% on this train instance.', impact: 'positive' });
  } else if (features.historical_fill_rate > 0.9) {
    factors.push({ icon: '🔴', label: 'Route Runs Full', detail: 'Historic fill rate is above 90%, so spare berths are rare.', impact: 'negative' });
  }

  return factors;
}

async function getHistoricalFillRate(trainId) {
  try {
    const [rows] = await pool.query(
      `SELECT
         COUNT(CASE WHEN status = 'confirmed' THEN 1 END)::float / NULLIF(COUNT(*), 0) AS fill_rate
       FROM bookings
       WHERE train_id = ?`,
      [trainId]
    );

    const ratio = parseFloat(rows[0]?.fill_rate);
    return Number.isFinite(ratio) ? ratio : DEFAULT_FILL_RATE;
  } catch (error) {
    console.warn('[PrebookingPrediction] historical_fill_rate fallback:', error.message);
    return DEFAULT_FILL_RATE;
  }
}

async function callMlService(features) {
  try {
    const response = await axios.post(`${ML_URL}/predict`, features, { timeout: 4000 });
    return response.data;
  } catch (error) {
    console.warn('[PrebookingPrediction] ML fallback:', error.message);
    return {
      confirmation_probability: null,
      confidence: 'unavailable',
      label: 'ml unavailable',
    };
  }
}

function rankTrain(left, right) {
  const leftProbability = left.confirmation_probability;
  const rightProbability = right.confirmation_probability;

  if (leftProbability == null && rightProbability != null) return 1;
  if (leftProbability != null && rightProbability == null) return -1;
  if (leftProbability != null && rightProbability != null && leftProbability !== rightProbability) {
    return rightProbability - leftProbability;
  }
  if (left.available_seats !== right.available_seats) {
    return right.available_seats - left.available_seats;
  }
  if ((left.adjusted_fare ?? Infinity) !== (right.adjusted_fare ?? Infinity)) {
    return (left.adjusted_fare ?? Infinity) - (right.adjusted_fare ?? Infinity);
  }
  return left.train_number.localeCompare(right.train_number);
}

async function getWindowTrains(source, destination, seatClass, startDate, endDate) {
  const [trains] = await pool.query(
    `SELECT
       t.id,
       t.train_number,
       t.train_name,
       t.source,
       t.destination,
       t.departure_time,
       t.arrival_time,
       t.base_fare_sl,
       t.base_fare_3a,
       t.base_fare_2a,
       t.base_fare_1a,
       DATE(t.departure_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS travel_date,
       COUNT(s.id) AS available_seats
     FROM trains t
     LEFT JOIN seats s
       ON s.train_id = t.id
      AND s.is_available = TRUE
      AND s.class = ?
     WHERE t.source = ?
       AND t.destination = ?
       AND DATE(t.departure_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') BETWEEN ? AND ?
     GROUP BY t.id
     ORDER BY t.departure_time ASC`,
    [seatClass, source, destination, startDate, endDate]
  );

  return trains.map((train) => ({
    ...train,
    available_seats: Number(train.available_seats) || 0,
    travel_date: typeof train.travel_date === 'string' ? train.travel_date : getDateString(new Date(train.travel_date)),
  }));
}

async function enrichTrain(train, seatClass) {
  const availableSeats = Number(train.available_seats) || 0;
  const waitlistPosition = estimateWaitlistPosition(availableSeats);
  const historicalFillRate = await getHistoricalFillRate(train.id);
  const features = buildFeatures({
    waitlistPosition,
    departureTime: train.departure_time,
    arrivalTime: train.arrival_time,
    seatClass,
    historicalFillRate,
  });
  const ml = await callMlService(features);
  const fare = getFareForClass(train, seatClass);
  const surgeMultiplier = getSurgeMultiplier(availableSeats);

  return {
    train_id: train.id,
    train_number: train.train_number,
    train_name: train.train_name,
    departure_time: train.departure_time,
    arrival_time: train.arrival_time,
    available_seats: availableSeats,
    fare,
    confirmation_probability: ml.confirmation_probability,
    confidence: ml.confidence,
    availability_status: getAvailabilityStatus(availableSeats),
    surge_multiplier: surgeMultiplier,
    adjusted_fare: fare == null ? null : Math.round(fare * surgeMultiplier),
    waitlist_position_estimate: waitlistPosition,
    factors: buildFactors(features),
    ml_features: features,
  };
}

exports.getPrebookingPrediction = async (req, res) => {
  try {
    const { source, destination, seat_class: seatClass, base_date: baseDate } = req.query;

    if (!source || !destination || !seatClass || !baseDate) {
      return res.status(400).json({ error: 'source, destination, seat_class and base_date are required.' });
    }

    if (!SUPPORTED_CLASSES.includes(seatClass)) {
      return res.status(400).json({ error: 'seat_class must be one of SL, 3A, 2A or 1A.' });
    }

    const parsedBaseDate = parseDateOnly(baseDate);
    if (!parsedBaseDate) {
      return res.status(400).json({ error: 'base_date must be in YYYY-MM-DD format.' });
    }

    const endDate = addDays(parsedBaseDate, 6);
    const trains = await getWindowTrains(
      source,
      destination,
      seatClass,
      getDateString(parsedBaseDate),
      getDateString(endDate)
    );

    const dailyPredictions = await Promise.all(
      Array.from({ length: 7 }, async (_, offset) => {
        const travelDate = addDays(parsedBaseDate, offset);
        const dateString = getDateString(travelDate);
        const trainsForDay = trains.filter((train) => train.travel_date === dateString);
        const enrichedTrains = await Promise.all(trainsForDay.map((train) => enrichTrain(train, seatClass)));
        const rankedTrains = enrichedTrains.sort(rankTrain);
        const bestTrain = rankedTrains[0] || null;

        return {
          date: dateString,
          day_label: DAY_LABELS[travelDate.getDay()],
          train_count: rankedTrains.length,
          best_train: bestTrain
            ? {
                train_id: bestTrain.train_id,
                train_number: bestTrain.train_number,
                train_name: bestTrain.train_name,
                departure_time: bestTrain.departure_time,
                arrival_time: bestTrain.arrival_time,
                available_seats: bestTrain.available_seats,
                fare: bestTrain.fare,
              }
            : null,
          confirmation_probability: bestTrain?.confirmation_probability ?? null,
          confidence: bestTrain?.confidence ?? 'unavailable',
          availability_status: bestTrain?.availability_status ?? 'waitlist',
          surge_multiplier: bestTrain?.surge_multiplier ?? 1.45,
          adjusted_fare: bestTrain?.adjusted_fare ?? null,
          trains: rankedTrains,
        };
      })
    );

    return res.json(dailyPredictions);
  } catch (error) {
    console.error('[PrebookingPrediction] Error:', error.message);
    return res.status(500).json({ error: error.message || 'Prebooking prediction failed' });
  }
};
