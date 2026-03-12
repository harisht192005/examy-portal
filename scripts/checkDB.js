const mysql = require('mysql2/promise');

async function check() {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'examy_portal'
        });
        const [rows] = await conn.execute('SELECT * FROM Exams ORDER BY created_at DESC');
        console.log("EXAMS IN DB:");
        console.log(JSON.stringify(rows, null, 2));
        conn.end();
    } catch (e) {
        console.error(e);
    }
}
check();
