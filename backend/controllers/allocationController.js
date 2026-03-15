const pool = require('../utils/db');

exports.reallocateSeats = async (req, res) => {
  const { trainId } = req.query;
  if (!trainId) return res.status(400).json({ error: 'trainId is required' });

  const conn = await pool.getConnection();
  const actions = [];

  try {
    await conn.beginTransaction();

    // Lock and fetch available seats
    const [availableSeats] = await conn.query(
      `SELECT * FROM seats 
       WHERE train_id = ? AND is_available = TRUE 
       ORDER BY class, seat_number
       FOR UPDATE`,
      [trainId]
    );

    if (availableSeats.length === 0) {
      await conn.rollback();
      conn.release();
      return res.json({ reallocated: 0, remaining_waitlist: 0, message: 'No seats available', actions: [] });
    }

    // Fetch waitlisted bookings with priority score
    const [waitlisted] = await conn.query(
      `SELECT b.id as booking_id, b.passenger_id,
              w.position, w.id as waitlist_id, w.assigned_class as class,
              b.booking_timestamp,
              (1.0 / w.position) * 0.4 +
              (1.0 / (DATEDIFF(NOW(), b.booking_timestamp) + 1)) * 0.2 AS priority_score
       FROM bookings b
       JOIN waitlist w ON w.booking_id = b.id
       WHERE b.train_id = ? AND b.status = 'waitlisted'
       ORDER BY priority_score DESC, w.position ASC
       FOR UPDATE`,
      [trainId]
    );

    if (waitlisted.length === 0) {
      await conn.rollback();
      conn.release();
      return res.json({ reallocated: 0, remaining_waitlist: 0, message: 'No waitlisted passengers', actions: [] });
    }

    let seatIndex = 0;
    let reallocated = 0;

    for (const passenger of waitlisted) {
      if (seatIndex >= availableSeats.length) break;

      // Prefer class match, else take next available
      let seat = availableSeats.find(
        (s, idx) => idx >= seatIndex && s.class === passenger.class
      );
      
      // Removed the logic that assumes we can just grab from seatIndex if not found.
      // If we don't find a matching class seat, we just take the next one sequentially from seatIndex.
      if (!seat) {
        seat = availableSeats[seatIndex];
      }
      
      // Update seatIndex so we don't use this seat again
      seatIndex = availableSeats.indexOf(seat) + 1;

      // Update booking to confirmed
      await conn.query(
        `UPDATE bookings 
         SET status = 'confirmed', seat_id = ? 
         WHERE id = ?`,
        [seat.id, passenger.booking_id]
      );

      // Mark seat as taken
      await conn.query(
        `UPDATE seats SET is_available = FALSE WHERE id = ?`,
        [seat.id]
      );

      // Remove from waitlist
      await conn.query(
        `DELETE FROM waitlist WHERE id = ?`,
        [passenger.waitlist_id]
      );

      actions.push({
        booking_id:    passenger.booking_id,
        passenger_id:  passenger.passenger_id,
        seat_assigned: seat.seat_number,
        class:         seat.class,
        waitlist_pos:  passenger.position,
        promoted_at:   new Date().toISOString()
      });

      reallocated++;
    }

    // Renumber remaining waitlist positions
    const [remaining] = await conn.query(
      `SELECT w.id FROM waitlist w
       JOIN bookings b ON w.booking_id = b.id
       WHERE b.train_id = ?
       ORDER BY w.position ASC`,
      [trainId]
    );

    for (let i = 0; i < remaining.length; i++) {
      await conn.query(
        `UPDATE waitlist SET position = ? WHERE id = ?`,
        [i + 1, remaining[i].id]
      );
    }

    await conn.commit();
    conn.release();

    return res.json({
      reallocated,
      remaining_waitlist: remaining.length,
      actions
    });

  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('Reallocation error:', err.message);
    return res.status(500).json({ error: 'Reallocation failed', details: err.message });
  }
};

// Auto-trigger on cancellation — call this from cancelBooking controller
exports.triggerOnCancellation = async (trainId) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [available] = await conn.query(
      `SELECT * FROM seats WHERE train_id = ? AND is_available = TRUE LIMIT 1 FOR UPDATE`,
      [trainId]
    );

    if (available.length === 0) { await conn.rollback(); conn.release(); return; }

    const [next] = await conn.query(
      `SELECT b.id as booking_id, w.id as waitlist_id
       FROM waitlist w JOIN bookings b ON w.booking_id = b.id
       WHERE b.train_id = ? AND b.status = 'waitlisted'
       ORDER BY w.position ASC LIMIT 1 FOR UPDATE`,
      [trainId]
    );

    if (next.length === 0) { await conn.rollback(); conn.release(); return; }

    await conn.query(
      `UPDATE bookings SET status = 'confirmed', seat_id = ? WHERE id = ?`,
      [available[0].id, next[0].booking_id]
    );
    await conn.query(`UPDATE seats SET is_available = FALSE WHERE id = ?`, [available[0].id]);
    await conn.query(`DELETE FROM waitlist WHERE id = ?`, [next[0].waitlist_id]);

    await conn.commit();
    conn.release();
    console.log(`[Allocation] Auto-promoted booking ${next[0].booking_id} on train ${trainId}`);

  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('[Allocation] Auto-trigger failed:', err.message);
  }
};
