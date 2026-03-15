'use strict';
/**
 * populateDB.js
 * Seeds the database with trains, seats, and schedules for 8 cities.
 * Run: node scripts/populateDB.js
 */

require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad'];

const ROUTES = [
    { from: 'Mumbai', to: 'Delhi', km: 1400, hrs: 16, trains: 4 },
    { from: 'Delhi', to: 'Kolkata', km: 1500, hrs: 17, trains: 3 },
    { from: 'Bangalore', to: 'Chennai', km: 350, hrs: 5, trains: 5 },
    { from: 'Mumbai', to: 'Pune', km: 150, hrs: 3, trains: 6 },
    { from: 'Delhi', to: 'Ahmedabad', km: 950, hrs: 12, trains: 3 },
    { from: 'Hyderabad', to: 'Bangalore', km: 570, hrs: 8, trains: 3 },
    { from: 'Chennai', to: 'Kolkata', km: 1660, hrs: 27, trains: 2 },
    { from: 'Pune', to: 'Ahmedabad', km: 660, hrs: 9, trains: 2 },
    { from: 'Mumbai', to: 'Hyderabad', km: 740, hrs: 10, trains: 3 },
    { from: 'Delhi', to: 'Bangalore', km: 2150, hrs: 33, trains: 2 },
];

const CLASSES = ['SL', '3A', '2A', '1A'];
const SEATS_PER_CLASS = { SL: 25, '3A': 15, '2A': 7, '1A': 3 };

let trainCounter = 20001;

async function main() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'railway_db',
        multipleStatements: true,
    });

    console.log('Connected to DB');

    // Create schema
    await conn.execute(`
    CREATE TABLE IF NOT EXISTS passengers (
      id      INT AUTO_INCREMENT PRIMARY KEY,
      name    VARCHAR(100) NOT NULL,
      age     TINYINT UNSIGNED NOT NULL,
      contact VARCHAR(20) NOT NULL
    ) ENGINE=InnoDB;
  `);

    await conn.execute(`
    CREATE TABLE IF NOT EXISTS trains (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      train_number   VARCHAR(10) NOT NULL UNIQUE,
      source         VARCHAR(100) NOT NULL,
      destination    VARCHAR(100) NOT NULL,
      departure_time DATETIME NOT NULL,
      arrival_time   DATETIME NOT NULL,
      distance_km    INT DEFAULT 0,
      total_seats    INT DEFAULT 44
    ) ENGINE=InnoDB;
  `);

    await conn.execute(`
    CREATE TABLE IF NOT EXISTS seats (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      train_id     INT NOT NULL,
      seat_number  VARCHAR(10) NOT NULL,
      class        ENUM('SL','3A','2A','1A') NOT NULL,
      is_available BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (train_id) REFERENCES trains(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

    await conn.execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      passenger_id      INT NOT NULL,
      train_id          INT NOT NULL,
      seat_id           INT,
      pnr_code          VARCHAR(12) NOT NULL UNIQUE,
      status            ENUM('confirmed','waitlisted','cancelled') NOT NULL DEFAULT 'waitlisted',
      booking_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (passenger_id) REFERENCES passengers(id),
      FOREIGN KEY (train_id)     REFERENCES trains(id),
      FOREIGN KEY (seat_id)      REFERENCES seats(id)
    ) ENGINE=InnoDB;
  `);

    await conn.execute(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      booking_id     INT NOT NULL UNIQUE,
      position       INT NOT NULL,
      assigned_class ENUM('SL','3A','2A','1A') NOT NULL,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

    // Seed trains and seats
    const baseDate = new Date('2026-03-15T00:00:00Z');
    let insertedTrains = 0;

    for (const route of ROUTES) {
        for (let t = 0; t < route.trains; t++) {
            const dep = new Date(baseDate);
            dep.setUTCHours(6 + t * 2, 0, 0, 0);
            const arr = new Date(dep);
            arr.setUTCHours(arr.getUTCHours() + route.hrs);

            const trainNum = `TRN${trainCounter++}`;
            const totalSeats = Object.values(SEATS_PER_CLASS).reduce((a, b) => a + b, 0);

            const [trainRes] = await conn.execute(
                `INSERT IGNORE INTO trains (train_number, source, destination, departure_time, arrival_time, distance_km, total_seats)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [trainNum, route.from, route.to,
                    dep.toISOString().slice(0, 19).replace('T', ' '),
                    arr.toISOString().slice(0, 19).replace('T', ' '),
                    route.km, totalSeats]
            );

            if (trainRes.affectedRows === 0) continue;
            const trainId = trainRes.insertId;
            insertedTrains++;

            // Seed seats
            for (const cls of CLASSES) {
                for (let s = 1; s <= SEATS_PER_CLASS[cls]; s++) {
                    await conn.execute(
                        'INSERT INTO seats (train_id, seat_number, class) VALUES (?, ?, ?)',
                        [trainId, `${cls}-${s}`, cls]
                    );
                }
            }
        }
    }

    console.log(`✅ Inserted ${insertedTrains} trains with seats`);
    await conn.end();
    console.log('Done. Database seeded successfully.');
}

main().catch(err => { console.error(err); process.exit(1); });
