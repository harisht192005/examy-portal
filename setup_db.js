const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setup() {
    try {
        console.log('Connecting to MySQL Server (localhost)...');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true
        });

        console.log('Connected.');

        const schemaPath = path.join(__dirname, 'models', 'schema.sql');
        const schemaQuery = fs.readFileSync(schemaPath, { encoding: 'utf-8' });

        console.log('Executing schema...');
        await connection.query(schemaQuery);

        console.log('Database and tables created successfully.');
        await connection.end();
    } catch (err) {
        console.error('Failed to setup database:', err.message);
        if (err.code === 'ECONNREFUSED') {
            console.error('Make sure your MySQL server (like XAMPP or WAMP) is running locally.');
        }
        process.exit(1);
    }
}

setup();
