'use strict';

const pool = require('../utils/db');

const FARE_PER_KM = { SL: 0.4, '3A': 0.8, '2A': 1.2, '1A': 2.0 };

/**
 * GET /api/alternatives
 * ?source=&destination=&date=YYYY-MM-DD&preference=fastest|cheapest|fewest_transfers
 */
async function getAlternatives(req, res, next) {
    const { source, destination, date, preference = 'fastest' } = req.query;

    if (!source || !destination || !date) {
        return res.status(400).json({ error: 'source, destination, and date are required' });
    }

    try {
        const requestedDate = new Date(date);
        const minDate = new Date(requestedDate); minDate.setDate(minDate.getDate() - 2);
        const maxDate = new Date(requestedDate); maxDate.setDate(maxDate.getDate() + 2);

        const minDateStr = formatDate(minDate);
        const maxDateStr = formatDate(maxDate);

        // --- Direct routes (same source→destination, ±2 days) ---
        const [directRoutes] = await pool.query(
            `SELECT t.id, t.train_number, t.train_name, t.source, t.destination,
                t.departure_time, t.arrival_time, t.distance_km,
                (SELECT s.class FROM seats s
                 WHERE s.train_id = t.id AND s.is_available = TRUE
                 ORDER BY CASE s.class WHEN 'SL' THEN 1 WHEN '3A' THEN 2 WHEN '2A' THEN 3 WHEN '1A' THEN 4 END
                 LIMIT 1) AS class_available,
                (SELECT COUNT(*) FROM seats s2 WHERE s2.train_id = t.id AND s2.is_available = TRUE) AS avail_seats
            FROM trains t
            WHERE t.source = $1 AND t.destination = $2
              AND (t.departure_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date BETWEEN $3::date AND $4::date
            ORDER BY t.departure_time ASC`,
            [source, destination, minDateStr, maxDateStr]
        );

        // --- Multi-leg routes: leg1 = source → intermediate ---
        const [leg1Routes] = await pool.query(
            `SELECT t.id, t.train_number, t.source, t.destination AS intermediate,
                t.departure_time, t.arrival_time, t.distance_km,
                (SELECT s.class FROM seats s
                 WHERE s.train_id = t.id AND s.is_available = TRUE
                 ORDER BY CASE s.class WHEN 'SL' THEN 1 WHEN '3A' THEN 2 WHEN '2A' THEN 3 WHEN '1A' THEN 4 END
                 LIMIT 1) AS class_available
            FROM trains t
            WHERE t.source = $1 AND t.destination != $2
              AND (t.departure_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date BETWEEN $3::date AND $4::date`,
            [source, destination, minDateStr, maxDateStr]
        );

        const alternatives = [];

        // Build direct alternatives
        for (const r of directRoutes) {
            if (parseInt(r.avail_seats, 10) === 0) continue;
            const fare = calcFare(r.distance_km, r.class_available);
            const dur = durationMinutes(r.departure_time, r.arrival_time);
            alternatives.push({
                legs: [{
                    train_number: r.train_number,
                    train_name: r.train_name,
                    source: r.source,
                    destination: r.destination,
                    departure: r.departure_time,
                    arrival: r.arrival_time,
                    class_available: r.class_available || 'SL',
                    fare,
                }],
                total_duration_minutes: dur,
                total_fare: fare,
                transfers: 0,
            });
        }

        // Build multi-leg (1 transfer) alternatives
        await Promise.all(leg1Routes.map(async (l1) => {
            const intermediate = l1.intermediate;
            const arrivalISO = new Date(l1.arrival_time).toISOString();

            const [leg2Routes] = await pool.query(
                `SELECT t.id, t.train_number, t.source, t.destination,
                    t.departure_time, t.arrival_time, t.distance_km,
                    (SELECT s.class FROM seats s
                     WHERE s.train_id = t.id AND s.is_available = TRUE
                     ORDER BY CASE s.class WHEN 'SL' THEN 1 WHEN '3A' THEN 2 WHEN '2A' THEN 3 WHEN '1A' THEN 4 END
                     LIMIT 1) AS class_available,
                    (SELECT COUNT(*) FROM seats s2 WHERE s2.train_id = t.id AND s2.is_available = TRUE) AS avail_seats
                FROM trains t
                WHERE t.source = $1 AND t.destination = $2
                  AND t.departure_time >= ($3::timestamptz + INTERVAL '1 hour')`,
                [intermediate, destination, arrivalISO]
            );

            for (const l2 of leg2Routes) {
                if (parseInt(l2.avail_seats, 10) === 0) continue;
                const fare1 = calcFare(l1.distance_km, l1.class_available);
                const fare2 = calcFare(l2.distance_km, l2.class_available);

                alternatives.push({
                    legs: [
                        {
                            train_number: l1.train_number,
                            source: l1.source,
                            destination: intermediate,
                            departure: l1.departure_time,
                            arrival: l1.arrival_time,
                            class_available: l1.class_available || 'SL',
                            fare: fare1,
                        },
                        {
                            train_number: l2.train_number,
                            source: l2.source,
                            destination: l2.destination,
                            departure: l2.departure_time,
                            arrival: l2.arrival_time,
                            class_available: l2.class_available || 'SL',
                            fare: fare2,
                        },
                    ],
                    total_duration_minutes: durationMinutes(l1.departure_time, l2.arrival_time),
                    total_fare: fare1 + fare2,
                    transfers: 1,
                });
            }
        }));

        if (alternatives.length === 0) {
            return res.json({ alternatives: [], message: 'No alternatives found for the given route and date window' });
        }

        // Sort by preference
        alternatives.sort((a, b) => {
            if (preference === 'cheapest') return a.total_fare - b.total_fare;
            if (preference === 'fewest_transfers') {
                const t = a.transfers - b.transfers;
                return t !== 0 ? t : a.total_duration_minutes - b.total_duration_minutes;
            }
            return a.total_duration_minutes - b.total_duration_minutes; // fastest (default)
        });

        const ranked = alternatives.slice(0, 5).map((alt, i) => ({ rank: i + 1, ...alt }));
        return res.json({ alternatives: ranked });

    } catch (err) {
        next(err);
    }
}

function calcFare(distanceKm, seatClass) {
    const rate = FARE_PER_KM[seatClass] || FARE_PER_KM.SL;
    return Math.round((distanceKm || 200) * rate);
}

function durationMinutes(dep, arr) {
    return Math.round((new Date(arr) - new Date(dep)) / 60000);
}

function formatDate(d) {
    return d.toISOString().split('T')[0];
}

module.exports = { getAlternatives };
