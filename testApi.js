const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/exams',
    method: 'GET',
    headers: {
        'Cookie': 'jwt=dummy_because_we_are_bypassing_auth'
    }
};

const req = http.request(options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`BODY: ${data}`);
    });
});

req.on('error', e => console.error(e));
req.end();
