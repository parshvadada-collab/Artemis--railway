'use strict';
require('dotenv').config({ path: '../.env' });
const mysql = require('pg');

const STATIONS = [
  'Ahmedabad', 'Bangalore', 'Bhubaneswar', 'Chennai',
  'Delhi', 'Hyderabad', 'Indore', 'Jaipur',
  'Kolkata', 'Lucknow', 'Mumbai', 'Nagpur',
  'Patna', 'Pune', 'Surat'
];

const TRAIN_NAMES = [
  'Superfast Express', 'Rajdhani Express', 'Shatabdi Express', 
  'Duronto Express', 'Garib Rath', 'Intercity Express', 
  'Jan Shatabdi', 'Sampark Kranti', 'Humsafar Express', 'Vande Bharat'
];

const CLASSES = ['SL', '3A', '2A', '1A'];
const SEATS_PER_CLASS = { SL: 25, '3A': 15, '2A': 7, '1A': 3 };

async function main() {
    const conn = new (require('pg').Client)({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'railway_db',
        ssl: { rejectUnauthorized: false }
    });
    await conn.connect();

    console.log('Connected to DB. Resetting tables...');

    // Create schema
    await conn.query(`
    CREATE TABLE IF NOT EXISTS passengers (
      id      SERIAL PRIMARY KEY,
      name    VARCHAR(100) NOT NULL,
      age     SMALLINT NOT NULL,
      contact VARCHAR(20) NOT NULL
    ) ;
    `);

    await conn.query(`
    CREATE TABLE IF NOT EXISTS trains (
      id             SERIAL PRIMARY KEY,
      train_number   VARCHAR(10) NOT NULL UNIQUE,
      train_name     VARCHAR(100) DEFAULT 'Express',
      source         VARCHAR(100) NOT NULL,
      destination    VARCHAR(100) NOT NULL,
      departure_time TIMESTAMP NOT NULL,
      arrival_time   TIMESTAMP NOT NULL,
      distance_km    INT DEFAULT 0,
      total_seats    INT DEFAULT 44,
      base_fare_sl   INT DEFAULT 450,
      base_fare_3a   INT DEFAULT 980,
      base_fare_2a   INT DEFAULT 1450,
      base_fare_1a   INT DEFAULT 2800
    ) ;
    `);

    await conn.query(`
    CREATE TABLE IF NOT EXISTS seats (
      id           SERIAL PRIMARY KEY,
      train_id     INT NOT NULL,
      seat_number  VARCHAR(10) NOT NULL,
      class        VARCHAR(5) NOT NULL,
      is_available BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (train_id) REFERENCES trains(id) ON DELETE CASCADE
    ) ;
    `);

    await conn.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id                SERIAL PRIMARY KEY,
      passenger_id      INT NOT NULL,
      train_id          INT NOT NULL,
      seat_id           INT,
      pnr_code          VARCHAR(12) NOT NULL UNIQUE,
      status            VARCHAR(20) NOT NULL DEFAULT 'waitlisted',
      booking_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (passenger_id) REFERENCES passengers(id),
      FOREIGN KEY (train_id)     REFERENCES trains(id),
      FOREIGN KEY (seat_id)      REFERENCES seats(id)
    ) ;
    `);

    await conn.query(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id             SERIAL PRIMARY KEY,
      booking_id     INT NOT NULL UNIQUE,
      position       INT NOT NULL,
      assigned_class VARCHAR(5) NOT NULL,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    ) ;
    `);

    await conn.query('-- SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('DELETE FROM waitlist');
    await conn.query('DELETE FROM bookings');
    await conn.query('DELETE FROM seats');
    await conn.query('DELETE FROM trains');
    
    await conn.query('ALTER TABLE trains SERIAL = 1');
    await conn.query('ALTER TABLE seats SERIAL = 1');
    await conn.query('ALTER TABLE bookings SERIAL = 1');
    await conn.query('ALTER TABLE waitlist SERIAL = 1');
    await conn.query('-- SET FOREIGN_KEY_CHECKS = 1');

    console.log('Cleared old db data. Generating 30 days of schedules for all 210 routes...');

    let trainCounter = 10001;
    let insertedTrains = 0;
    
    // Create base dates array for the next 30 days starting from today
    let currentDate = new Date();
    currentDate.setUTCHours(0, 0, 0, 0);

    const dates = [];
    for (let i = 0; i < 30; i++) {
        let d = new Date(currentDate);
        d.setDate(d.getDate() + i);
        dates.push(d);
    }

    const MAX_TRAIN_BATCH = 500;
    const MAX_SEAT_BATCH = 5000;
    
    let trainsValues = [];
    let seatsValues = [];

    const flushTrains = async () => {
        if (trainsValues.length === 0) return;
        const placeholders = trainsValues.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
        const flatArgs = trainsValues.flat();
        await conn.query(
            `INSERT INTO trains (id, train_number, train_name, source, destination, departure_time, arrival_time, distance_km, total_seats, base_fare_sl, base_fare_3a, base_fare_2a, base_fare_1a) VALUES ${placeholders}`,
            flatArgs
        );
        trainsValues = [];
    };

    const flushSeats = async () => {
        if (seatsValues.length === 0) return;
        const placeholders = seatsValues.map(() => '(?, ?, ?)').join(',');
        const flatArgs = seatsValues.flat();
        await conn.query(
            `INSERT INTO seats (train_id, seat_number, class) VALUES ${placeholders}`,
            flatArgs
        );
        seatsValues = [];
    };

    let trainIdCtr = 1;

    for (let i = 0; i < STATIONS.length; i++) {
        for (let j = 0; j < STATIONS.length; j++) {
            if (i === j) continue;
            
            const from = STATIONS[i];
            const to = STATIONS[j];
            
            // Generate deterministic pseudo-random details for the route based on index hash
            const hash = (i * 17 + j * 31);
            const distance = 300 + (hash % 1500); 
            const speed = 70 + (hash % 40); 
            const hrs = Math.floor(distance / speed);
            const trainName = TRAIN_NAMES[hash % TRAIN_NAMES.length];
            
            // Realistic fare calculations
            let f_sl = Math.floor(distance * 0.5);
            let f_3a = Math.floor(distance * 1.2);
            let f_2a = Math.floor(distance * 1.8);
            let f_1a = Math.floor(distance * 3.0);
            
            // Realistic Class restrictions
            if (trainName === 'Garib Rath') f_1a = 0; 
            if (trainName === 'Shatabdi Express' || trainName === 'Vande Bharat') {
                f_sl = 0; 
                f_3a = 0;
            }

            for (const d of dates) {
                // Generate 1 train per day for this route
                const dep = new Date(d);
                const depHour = 6 + (hash % 14); // Distribute departure times
                dep.setUTCHours(depHour, 30, 0, 0);
                
                const arr = new Date(dep);
                arr.setUTCHours(arr.getUTCHours() + hrs);
                
                const trainNum = `TRN${trainCounter++}`;
                const totalSeats = 50;
                
                const currentTrainId = trainIdCtr++;

                trainsValues.push([
                    currentTrainId, trainNum, trainName, from, to,
                    dep.toISOString().slice(0, 19).replace('T', ' '),
                    arr.toISOString().slice(0, 19).replace('T', ' '),
                    distance, totalSeats,
                    f_sl, f_3a, f_2a, f_1a
                ]);
                
                insertedTrains++;

                // Seed seats for the train
                for (const cls of CLASSES) {
                    for (let s = 1; s <= SEATS_PER_CLASS[cls]; s++) {
                        seatsValues.push([currentTrainId, `${cls}-${s}`, cls]);
                    }
                }

                if (seatsValues.length >= MAX_SEAT_BATCH) {
                    await flushTrains();
                    await flushSeats();
                }
            }
        }
    }
    
    // Flush remaining
    await flushTrains();
    await flushSeats();

    console.log(`✅ Success! Seeded ${insertedTrains} daily trains with full seat tracking over the next 30 days.`);
    await conn.end();
}

main().catch(err => { console.error('Error during DB population:', err); process.exit(1); });


