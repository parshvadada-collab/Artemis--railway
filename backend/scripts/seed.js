'use strict';
/**
 * seed.js — Full route coverage seed for railway_management DB.
 *
 * Inserts 40 trains covering all key Indian city pairs.
 * Each train gets departure_time rows for every day in the next 60 days.
 * All times are stored in UTC (IST = UTC + 5h30m, so subtract 5:30 when storing).
 *
 * Run: node backend/scripts/seed.js
 */

require('dotenv').config({ path: 'd:/Datathon/railway-ticket-management/.env' });
const mysql = require('mysql2/promise');

// ── IST time → UTC datetime for a given base date ────────────────────────────
// istTime = "HH:MM", baseDate = JS Date (represents the IST calendar day)
function istToUTC(istTime, baseDate) {
    const [h, m] = istTime.split(':').map(Number);
    // Create a UTC date that represents IST midnight of baseDate
    const istMidnightUTC = new Date(Date.UTC(
        baseDate.getUTCFullYear(),
        baseDate.getUTCMonth(),
        baseDate.getUTCDate(),
        0, 0, 0
    ));
    // Add IST offset backwards: IST midnight = UTC 18:30 previous day
    // Instead: just subtract 5h30m from IST time
    const totalMinutes = h * 60 + m;
    const utcMinutes = totalMinutes - (5 * 60 + 30);
    const utcMs = istMidnightUTC.getTime() + utcMinutes * 60 * 1000;
    const d = new Date(utcMs);
    return d.toISOString().slice(0, 19).replace('T', ' ');
}

// Arrival that crosses midnight: if arrival < departure (in raw HH:MM), it's next day
function istArrivalToUTC(departureIST, arrivalIST, baseDate) {
    const [dh, dm] = departureIST.split(':').map(Number);
    const [ah, am] = arrivalIST.split(':').map(Number);
    const depMins = dh * 60 + dm;
    const arrMins = ah * 60 + am;
    // If arrival is "before" departure in time, it crosses midnight(s)
    // Use duration hint to figure out if it's +1 or +2 days
    let dayOffset = 0;
    if (arrMins <= depMins) dayOffset = 1;

    const arrDate = new Date(Date.UTC(
        baseDate.getUTCFullYear(),
        baseDate.getUTCMonth(),
        baseDate.getUTCDate() + dayOffset,
        0, 0, 0
    ));
    return istToUTC(arrivalIST, arrDate);
}

// ── Train definitions ─────────────────────────────────────────────────────────
const TRAIN_DEFS = [
    // ── Mumbai ↔ Delhi ────────────────────────────────────────────────────────
    { number:'TRN001', name:'Rajdhani Express',   src:'Mumbai',    dst:'Delhi',     dep:'16:00', arr:'08:00', dist:1385, seats:72,  sl:650,  a3:1750, a2:2500, a1:4200 },
    { number:'TRN002', name:'August Kranti Raj',  src:'Mumbai',    dst:'Delhi',     dep:'17:40', arr:'10:55', dist:1385, seats:72,  sl:590,  a3:1600, a2:2300, a1:3900 },
    { number:'TRN003', name:'Rajdhani Express',   src:'Delhi',     dst:'Mumbai',    dep:'16:35', arr:'08:15', dist:1385, seats:72,  sl:650,  a3:1750, a2:2500, a1:4200 },
    { number:'TRN004', name:'Punjab Mail',        src:'Delhi',     dst:'Mumbai',    dep:'07:15', arr:'01:25', dist:1385, seats:80,  sl:520,  a3:1400, a2:2100, a1:3600 },
    // ── Mumbai ↔ Pune ─────────────────────────────────────────────────────────
    { number:'TRN005', name:'Deccan Queen',       src:'Mumbai',    dst:'Pune',      dep:'07:15', arr:'10:25', dist:192,  seats:60,  sl:90,   a3:245,  a2:350,  a1:590  },
    { number:'TRN006', name:'Pragati Express',    src:'Mumbai',    dst:'Pune',      dep:'17:10', arr:'20:20', dist:192,  seats:60,  sl:90,   a3:245,  a2:350,  a1:590  },
    { number:'TRN007', name:'Shatabdi Express',   src:'Mumbai',    dst:'Pune',      dep:'06:25', arr:'09:05', dist:192,  seats:60,  sl:null, a3:null, a2:null, a1:545  },
    // ── Pune ↔ Mumbai ─────────────────────────────────────────────────────────
    { number:'TRN008', name:'Deccan Queen',       src:'Pune',      dst:'Mumbai',    dep:'17:15', arr:'20:25', dist:192,  seats:60,  sl:90,   a3:245,  a2:350,  a1:590  },
    { number:'TRN009', name:'Indrayani Express',  src:'Pune',      dst:'Mumbai',    dep:'05:55', arr:'09:15', dist:192,  seats:60,  sl:85,   a3:230,  a2:330,  a1:560  },
    // ── Delhi ↔ Bangalore ─────────────────────────────────────────────────────
    { number:'TRN010', name:'Rajdhani Express',   src:'Delhi',     dst:'Bangalore', dep:'20:00', arr:'05:30', dist:2150, seats:72,  sl:740,  a3:1980, a2:2850, a1:4800 },
    { number:'TRN011', name:'Karnataka Express',  src:'Delhi',     dst:'Bangalore', dep:'14:30', arr:'07:00', dist:2150, seats:80,  sl:620,  a3:1680, a2:2400, a1:4050 },
    // ── Bangalore ↔ Delhi ─────────────────────────────────────────────────────
    { number:'TRN012', name:'Rajdhani Express',   src:'Bangalore', dst:'Delhi',     dep:'20:15', arr:'05:45', dist:2150, seats:72,  sl:740,  a3:1980, a2:2850, a1:4800 },
    { number:'TRN013', name:'Karnataka Express',  src:'Bangalore', dst:'Delhi',     dep:'18:00', arr:'11:15', dist:2150, seats:80,  sl:620,  a3:1680, a2:2400, a1:4050 },
    // ── Mumbai ↔ Bangalore ────────────────────────────────────────────────────
    { number:'TRN014', name:'Udyan Express',      src:'Mumbai',    dst:'Bangalore', dep:'08:05', arr:'06:40', dist:1030, seats:72,  sl:480,  a3:1290, a2:1850, a1:3100 },
    { number:'TRN015', name:'Rajdhani Express',   src:'Mumbai',    dst:'Bangalore', dep:'20:10', arr:'12:15', dist:1030, seats:72,  sl:null, a3:1750, a2:2500, a1:4200 },
    // ── Bangalore ↔ Mumbai ────────────────────────────────────────────────────
    { number:'TRN016', name:'Udyan Express',      src:'Bangalore', dst:'Mumbai',    dep:'19:45', arr:'18:20', dist:1030, seats:72,  sl:480,  a3:1290, a2:1850, a1:3100 },
    { number:'TRN017', name:'Rani Chennamma Exp', src:'Bangalore', dst:'Mumbai',    dep:'22:05', arr:'18:00', dist:1030, seats:72,  sl:430,  a3:1150, a2:1650, a1:2800 },
    // ── Delhi ↔ Chennai ───────────────────────────────────────────────────────
    { number:'TRN018', name:'GT Express',         src:'Delhi',     dst:'Chennai',   dep:'12:30', arr:'19:00', dist:2180, seats:80,  sl:680,  a3:1820, a2:2600, a1:4400 },
    { number:'TRN019', name:'Tamil Nadu Express', src:'Delhi',     dst:'Chennai',   dep:'22:30', arr:'07:00', dist:2180, seats:80,  sl:660,  a3:1770, a2:2530, a1:4250 },
    // ── Chennai ↔ Delhi ───────────────────────────────────────────────────────
    { number:'TRN020', name:'Tamil Nadu Express', src:'Chennai',   dst:'Delhi',     dep:'22:00', arr:'07:10', dist:2180, seats:80,  sl:660,  a3:1770, a2:2530, a1:4250 },
    { number:'TRN021', name:'GT Express',         src:'Chennai',   dst:'Delhi',     dep:'21:30', arr:'05:45', dist:2180, seats:80,  sl:680,  a3:1820, a2:2600, a1:4400 },
    // ── Mumbai ↔ Chennai ──────────────────────────────────────────────────────
    { number:'TRN022', name:'Chennai Express',    src:'Mumbai',    dst:'Chennai',   dep:'13:40', arr:'15:00', dist:1330, seats:80,  sl:500,  a3:1340, a2:1920, a1:3240 },
    { number:'TRN023', name:'Dadar Chennai Exp',  src:'Mumbai',    dst:'Chennai',   dep:'23:50', arr:'04:45', dist:1330, seats:80,  sl:470,  a3:1260, a2:1800, a1:3050 },
    // ── Chennai ↔ Mumbai ──────────────────────────────────────────────────────
    { number:'TRN024', name:'Chennai Express',    src:'Chennai',   dst:'Mumbai',    dep:'06:00', arr:'08:25', dist:1330, seats:80,  sl:500,  a3:1340, a2:1920, a1:3240 },
    { number:'TRN024B',name:'Dadar Chennai Exp',  src:'Chennai',   dst:'Mumbai',    dep:'18:15', arr:'20:40', dist:1330, seats:80,  sl:470,  a3:1260, a2:1800, a1:3050 },
    // ── Delhi ↔ Kolkata ───────────────────────────────────────────────────────
    { number:'TRN025', name:'Rajdhani Express',   src:'Delhi',     dst:'Kolkata',   dep:'17:00', arr:'10:05', dist:1440, seats:72,  sl:null, a3:1820, a2:2610, a1:4400 },
    { number:'TRN026', name:'Poorva Express',     src:'Delhi',     dst:'Kolkata',   dep:'08:00', arr:'05:00', dist:1440, seats:80,  sl:590,  a3:1590, a2:2270, a1:3840 },
    // ── Kolkata ↔ Delhi ───────────────────────────────────────────────────────
    { number:'TRN027', name:'Rajdhani Express',   src:'Kolkata',   dst:'Delhi',     dep:'14:05', arr:'10:00', dist:1440, seats:72,  sl:null, a3:1820, a2:2610, a1:4400 },
    { number:'TRN028', name:'Poorva Express',     src:'Kolkata',   dst:'Delhi',     dep:'23:00', arr:'20:55', dist:1440, seats:80,  sl:590,  a3:1590, a2:2270, a1:3840 },
    // ── Hyderabad ↔ Delhi ─────────────────────────────────────────────────────
    { number:'TRN029', name:'Rajdhani Express',   src:'Hyderabad', dst:'Delhi',     dep:'15:55', arr:'10:30', dist:1575, seats:72,  sl:null, a3:1890, a2:2700, a1:4550 },
    { number:'TRN030', name:'Dakshin Express',    src:'Hyderabad', dst:'Delhi',     dep:'22:15', arr:'05:10', dist:1575, seats:80,  sl:600,  a3:1610, a2:2300, a1:3880 },
    // ── Delhi ↔ Hyderabad ─────────────────────────────────────────────────────
    { number:'TRN031', name:'Rajdhani Express',   src:'Delhi',     dst:'Hyderabad', dep:'15:45', arr:'10:05', dist:1575, seats:72,  sl:null, a3:1890, a2:2700, a1:4550 },
    { number:'TRN032', name:'Dakshin Express',    src:'Delhi',     dst:'Hyderabad', dep:'21:05', arr:'04:00', dist:1575, seats:80,  sl:600,  a3:1610, a2:2300, a1:3880 },
    // ── Delhi ↔ Jaipur ────────────────────────────────────────────────────────
    { number:'TRN033', name:'Shatabdi Express',   src:'Delhi',     dst:'Jaipur',    dep:'06:05', arr:'10:35', dist:308,  seats:60,  sl:null, a3:null, a2:null, a1:765  },
    { number:'TRN034', name:'Double Decker Exp',  src:'Delhi',     dst:'Jaipur',    dep:'17:30', arr:'22:05', dist:308,  seats:60,  sl:null, a3:null, a2:null, a1:690  },
    // ── Jaipur ↔ Delhi ────────────────────────────────────────────────────────
    { number:'TRN035', name:'Shatabdi Express',   src:'Jaipur',    dst:'Delhi',     dep:'17:45', arr:'22:05', dist:308,  seats:60,  sl:null, a3:null, a2:null, a1:765  },
    { number:'TRN036', name:'Ajmer Shatabdi',     src:'Jaipur',    dst:'Delhi',     dep:'14:50', arr:'19:55', dist:308,  seats:60,  sl:null, a3:null, a2:null, a1:720  },
    // ── Mumbai ↔ Hyderabad ────────────────────────────────────────────────────
    { number:'TRN037', name:'Hussainsagar Exp',   src:'Mumbai',    dst:'Hyderabad', dep:'21:45', arr:'14:15', dist:710,  seats:80,  sl:400,  a3:1070, a2:1530, a1:2590 },
    { number:'TRN038', name:'Konark Express',     src:'Mumbai',    dst:'Hyderabad', dep:'11:05', arr:'04:00', dist:710,  seats:80,  sl:390,  a3:1040, a2:1490, a1:2520 },
    // ── Hyderabad ↔ Mumbai ────────────────────────────────────────────────────
    { number:'TRN039', name:'Hussainsagar Exp',   src:'Hyderabad', dst:'Mumbai',    dep:'18:00', arr:'10:35', dist:710,  seats:80,  sl:400,  a3:1070, a2:1530, a1:2590 },
    { number:'TRN040', name:'Konark Express',     src:'Hyderabad', dst:'Mumbai',    dep:'07:15', arr:'23:55', dist:710,  seats:80,  sl:390,  a3:1040, a2:1490, a1:2520 },
];

// Seat classes and their counts per train
const SEAT_CLASSES = [
    { cls: 'SL',  count: 0.40 }, // 40% of seats
    { cls: '3A',  count: 0.30 }, // 30%
    { cls: '2A',  count: 0.20 }, // 20%
    { cls: '1A',  count: 0.10 }, // 10%
];

async function run() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host:     process.env.DB_HOST     || 'localhost',
            port:     process.env.DB_PORT     || 3306,
            user:     process.env.DB_USER     || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME     || 'railway_management',
        });
        console.log('✅ Connected to DB:', process.env.DB_NAME);

        // Get existing train numbers to avoid duplicates
        const [existing] = await conn.query('SELECT train_number FROM trains');
        const existingNums = new Set(existing.map(r => r.train_number));
        console.log(`ℹ️  Existing trains in DB: ${existingNums.size}`);

        // ── Fix schema: drop old unique constraint on train_number ────────────
        // We need (train_number, departure_time) to be unique, not just train_number
        // because the same train runs every day.
        try {
            await conn.query('ALTER TABLE trains DROP INDEX train_number');
            console.log('✅ Dropped old unique index on train_number');
        } catch (e) {
            if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log('ℹ️  train_number unique index already removed');
            } else {
                console.log('ℹ️  Could not drop index:', e.message);
            }
        }
        // Add composite unique to prevent true dups
        try {
            await conn.query('ALTER TABLE trains ADD UNIQUE KEY uq_train_departure (train_number, departure_time)');
            console.log('✅ Added composite unique index (train_number, departure_time)');
        } catch (e) {
            if (e.code === 'ER_DUP_KEYNAME' || e.message.includes('Duplicate key name')) {
                console.log('ℹ️  Composite unique index already exists');
            } else {
                console.log('ℹ️  Note:', e.message);
            }
        }

        // Build date range: today IST through next 60 days
        const todayUTC = new Date();
        // IST today
        const IST_OFFSET = 5.5 * 60 * 60 * 1000;
        const todayIST = new Date(todayUTC.getTime() + IST_OFFSET);
        const DAYS = 60;

        let trainInserted = 0;
        let seatInserted  = 0;
        let skipped       = 0;

        for (const t of TRAIN_DEFS) {
            // Each train number gets ONE entry per day in the date range
            // We use train_number as a template prefix + date suffix to keep them unique
            // But the schema has train_number as VARCHAR(10), so we only insert ONE canonical train row
            // and rely on the date-based search using departure_time.
            // Strategy: insert one train row per day (departure_time carries the date).

            for (let day = 0; day < DAYS; day++) {
                const baseIST = new Date(Date.UTC(
                    todayIST.getUTCFullYear(),
                    todayIST.getUTCMonth(),
                    todayIST.getUTCDate() + day
                ));

                // Build train_number for this day: TRN001_20260322 — truncate to 10 chars → use short form
                // Actually train_number is VARCHAR(10) so we can't embed a date.
                // Instead we just insert multiple rows with the SAME train_number (different departure_times).
                // That's allowed since train_number is not UNIQUE in this schema.

                const depUTC = istToUTC(t.dep, baseIST);
                const arrUTC = istArrivalToUTC(t.dep, t.arr, baseIST);

                // Check if this exact (train_number, departure_time date in IST) already exists
                const [dup] = await conn.query(
                    `SELECT id FROM trains 
                     WHERE train_number = ? 
                       AND DATE(CONVERT_TZ(departure_time, '+00:00', '+05:30')) = ?`,
                    [t.number, baseIST.toISOString().slice(0, 10)]
                );
                if (dup.length > 0) {
                    skipped++;
                    continue;
                }

                const [res] = await conn.execute(
                    `INSERT INTO trains 
                       (train_number, train_name, source, destination,
                        departure_time, arrival_time, distance_km, total_seats,
                        base_fare_sl, base_fare_3a, base_fare_2a, base_fare_1a)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        t.number, t.name, t.src, t.dst,
                        depUTC, arrUTC, t.dist, t.seats,
                        t.sl ?? null, t.a3 ?? null, t.a2 ?? null, t.a1 ?? null,
                    ]
                );
                const trainId = res.insertId;
                trainInserted++;

                // Insert seats for this train instance
                const seatRows = [];
                for (const sc of SEAT_CLASSES) {
                    const count = Math.round(t.seats * sc.count) || 1;
                    for (let s = 1; s <= count; s++) {
                        seatRows.push([trainId, `${sc.cls}${String(s).padStart(3,'0')}`, sc.cls, true]);
                    }
                }
                if (seatRows.length > 0) {
                    await conn.query(
                        'INSERT INTO seats (train_id, seat_number, class, is_available) VALUES ?',
                        [seatRows]
                    );
                    seatInserted += seatRows.length;
                }
            }

            process.stdout.write(`  → ${t.number} ${t.src}→${t.dst}: inserted for ${DAYS} days\n`);
        }

        console.log(`\n✅ Done!`);
        console.log(`   Trains inserted : ${trainInserted}`);
        console.log(`   Seats  inserted : ${seatInserted}`);
        console.log(`   Skipped (dup)   : ${skipped}`);

        await conn.end();
    } catch (err) {
        console.error('❌ Error:', err.message);
        if (conn) await conn.end().catch(() => {});
        process.exit(1);
    }
}

run();
