const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'examy_portal'
    });

    try {
        const [rows] = await connection.execute("DESCRIBE Users");
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error('Failed to describe table:', err);
    } finally {
        await connection.end();
    }
}

checkSchema();
