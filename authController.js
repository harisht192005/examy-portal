const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const validRole = role === 'admin' ? 'admin' : 'student';

        // Check if user exists
        const [existing] = await db.execute('SELECT id FROM Users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            'INSERT INTO Users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, validRole]
        );

        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const [users] = await db.execute('SELECT * FROM Users WHERE email = ?', [email]);
        const user = users[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set HTTP-only cookie
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({ message: 'Login successful', role: user.role, name: user.name });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.logout = (req, res) => {
    res.clearCookie('jwt');
    res.json({ message: 'Logged out successfully' });
};

exports.checkAuth = async (req, res) => {
    if (req.user) {
        try {
            const [users] = await db.execute('SELECT id, name, email, role FROM Users WHERE id = ?', [req.user.id]);
            if (users.length > 0) {
                return res.json({ authenticated: true, user: users[0] });
            }
        } catch (error) {
            console.error('checkAuth error:', error);
        }
    }
    return res.status(401).json({ authenticated: false });
};

exports.googleSignIn = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token is required' });

        // Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const email = payload.email;
        const name = payload.name;

        // Check if user exists
        const [users] = await db.execute('SELECT * FROM Users WHERE email = ?', [email]);
        let user = users[0];

        if (!user) {
            // Auto-register as student with random password
            const randomPassword = require('crypto').randomBytes(16).toString('hex');
            const hashedPassword = await bcrypt.hash(randomPassword, 10);

            const [result] = await db.execute(
                'INSERT INTO Users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
                [name, email, hashedPassword, 'student']
            );
            user = { id: result.insertId, role: 'student', name };
        }

        // Issue JWT session
        const jwtToken = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('jwt', jwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({ message: 'Google Sign-In successful', role: user.role, name: user.name });

    } catch (error) {
        console.error('Google Sign-In Error:', error);
        res.status(401).json({ error: 'Invalid Google Token' });
    }
};
