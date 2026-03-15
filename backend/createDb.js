const mysql = require('mysql2/promise');

async function createDatabase() {
  try {
    console.log("Attempting connect to MySQL at localhost:3306 as root (no password)...");
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });
    console.log('Connected!');
    await connection.query('CREATE DATABASE IF NOT EXISTS railway_management;');
    console.log('Database railway_management created or already exists.');
    await connection.end();
  } catch (error) {
    console.error('FULL ERROR:', error);
  }
}

createDatabase();
