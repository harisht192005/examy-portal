const mysql = require('mysql2/promise');
const fs = require('fs');

async function check() {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'examy_portal'
        });
        const [rows] = await conn.execute('SELECT * FROM Exams ORDER BY created_at DESC');
        fs.writeFileSync('db_output.json', JSON.stringify(rows, null, 2), 'utf8');
        conn.end();
    } catch (e) {
        console.error(e);
    }
}
check();
