require('dotenv').config({ path: 'd:/Datathon/railway-ticket-management/backend/.env' });
const mysql = require('mysql2/promise');

async function run() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true, 
    });
    
    console.log('Connected to MySQL host');

    await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'railway_db'}\``);
    await conn.execute(`USE \`${process.env.DB_NAME || 'railway_db'}\``);

    console.log('Using DB:', process.env.DB_NAME || 'railway_db');

    const queries = `
        ALTER TABLE trains ADD COLUMN train_name VARCHAR(100) DEFAULT 'Express';
        ALTER TABLE trains ADD COLUMN base_fare_sl INT DEFAULT 450;
        ALTER TABLE trains ADD COLUMN base_fare_3a INT DEFAULT 980;
        ALTER TABLE trains ADD COLUMN base_fare_2a INT DEFAULT 1450;
        ALTER TABLE trains ADD COLUMN base_fare_1a INT DEFAULT 2800;

        UPDATE trains SET train_name = 'Rajdhani Express', base_fare_sl=650, base_fare_3a=1200, base_fare_2a=1800, base_fare_1a=3200 WHERE source='Mumbai' AND destination='Delhi';
        UPDATE trains SET train_name = 'Duronto Express', base_fare_sl=550, base_fare_3a=1100, base_fare_2a=1600, base_fare_1a=2900 WHERE source='Delhi' AND destination='Kolkata';
        UPDATE trains SET train_name = 'Shatabdi Express', base_fare_sl=400, base_fare_3a=850, base_fare_2a=1250, base_fare_1a=2400 WHERE source='Bangalore' AND destination='Chennai';
        UPDATE trains SET train_name = 'Deccan Queen', base_fare_sl=180, base_fare_3a=420, base_fare_2a=680, base_fare_1a=1200 WHERE source='Mumbai' AND destination='Pune';
        UPDATE trains SET train_name = 'Koyna Express', base_fare_sl=200, base_fare_3a=450, base_fare_2a=720, base_fare_1a=1300 WHERE source='Pune' AND destination='Mumbai';
        UPDATE trains SET train_name = 'Garib Rath', base_fare_sl=350, base_fare_3a=780, base_fare_2a=1100, base_fare_1a=2100 WHERE source='Mumbai' AND destination='Hyderabad';
        UPDATE trains SET train_name = 'Karnataka Express', base_fare_sl=600, base_fare_3a=1150, base_fare_2a=1700, base_fare_1a=3000 WHERE source='Delhi' AND destination='Bangalore';
        UPDATE trains SET train_name = 'Falaknuma Express', base_fare_sl=480, base_fare_3a=950, base_fare_2a=1400, base_fare_1a=2600 WHERE source='Hyderabad' AND destination='Bangalore';
        UPDATE trains SET train_name = 'Coromandel Express', base_fare_sl=520, base_fare_3a=1050, base_fare_2a=1550, base_fare_1a=2800 WHERE source='Chennai' AND destination='Kolkata';
        UPDATE trains SET train_name = 'Ashram Express', base_fare_sl=430, base_fare_3a=900, base_fare_2a=1320, base_fare_1a=2500 WHERE source='Delhi' AND destination='Ahmedabad';
        UPDATE trains SET train_name = 'Express Special' WHERE train_name IS NULL OR train_name = 'Express';
    `;

    try {
        const statements = queries.split(';').map(q => q.trim()).filter(q => q.length > 0);
        for (let q of statements) {
            console.log('Executing:', q.substring(0, 50) + '...');
            try {
                await conn.execute(q);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME') {
                   console.log('Column already exists');
                } else {
                   throw e;
                }
            }
        }
        console.log('Successfully updated trains.');
    } catch (e) {
        console.error(e);
    }
    
    await conn.end();
}

run();
