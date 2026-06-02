const express = require('express');
const path = require('path');
const morgan = require('morgan');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

// MySQL Database Credentials (default XAMPP setup)
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'blink_travel';

let pool;

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from the frontend directory (sibling to backend)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Initialize MySQL Database & Tables
async function initDB() {
    try {
        // Connect to MySQL server (without selecting DB first)
        const connection = await mysql.createConnection({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASSWORD
        });

        // Create database if not exists
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
        console.log(`MySQL Database "${DB_NAME}" initialized.`);
        await connection.end();

        // Create connection pool targeting the DB
        pool = mysql.createPool({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Initialize Tables
        await pool.query(`
            CREATE TABLE IF NOT EXISTS subscribers (
                email VARCHAR(255) PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                package VARCHAR(100) NOT NULL,
                guests INT NOT NULL,
                date DATE NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('MySQL Database tables verified/created successfully.');
    } catch (err) {
        console.error('==================================================');
        console.error('  ERROR: MySQL Database initialization failed!');
        console.error('  Please verify that:');
        console.error('  1. XAMPP Control Panel is open.');
        console.error('  2. Apache & MySQL modules are started (running).');
        console.error('  3. Port is 3306 (default MySQL port).');
        console.error('==================================================');
        console.error(err.message);
        process.exit(1);
    }
}

// ----------------------------------------------------------------
// Public API Endpoints
// ----------------------------------------------------------------

// 1. Subscribe to Newsletter
app.post('/api/subscribe', async (req, res) => {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    try {
        await pool.query('INSERT INTO subscribers (email) VALUES (?)', [email.trim()]);
        res.status(200).json({ message: 'Thank you for subscribing to our newsletter!' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'This email is already subscribed.' });
        }
        console.error(err);
        res.status(500).json({ error: 'Database write error. Check server logs.' });
    }
});

// 2. Contact Message Submit
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        await pool.query(
            'INSERT INTO messages (name, email, message) VALUES (?, ?, ?)',
            [name.trim(), email.trim(), message.trim()]
        );
        res.status(200).json({ message: 'Your message has been successfully received. We will contact you soon.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database write error. Check server logs.' });
    }
});

// 3. Tour Booking Submit
app.post('/api/book', async (req, res) => {
    const { name, email, package: pkg, guests, date } = req.body;

    if (!name || !email || !pkg || !guests || !date) {
        return res.status(400).json({ error: 'All booking fields are required.' });
    }

    try {
        await pool.query(
            'INSERT INTO bookings (name, email, package, guests, date) VALUES (?, ?, ?, ?, ?)',
            [name.trim(), email.trim(), pkg, parseInt(guests) || 1, date]
        );
        res.status(200).json({ message: 'Your Bali booking has been requested! Check your inbox for confirmation.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database write error. Check server logs.' });
    }
});

// ----------------------------------------------------------------
// Protected Admin API Endpoints
// ----------------------------------------------------------------

// Simple credentials verification helper
function verifyAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Blink Admin Console"');
        return res.status(401).json({ error: 'Authentication required' });
    }

    const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const user = auth[0];
    const pass = auth[1];

    // Simple default admin credentials (username: admin, password: admin123)
    if (user === 'admin' && pass === 'admin123') {
        next();
    } else {
        res.setHeader('WWW-Authenticate', 'Basic realm="Blink Admin Console"');
        return res.status(401).json({ error: 'Invalid login credentials' });
    }
}

// Fetch all database records for Dashboard
app.get('/api/admin/data', verifyAdmin, async (req, res) => {
    try {
        const [subscribers] = await pool.query('SELECT * FROM subscribers ORDER BY timestamp DESC');
        const [messages] = await pool.query('SELECT * FROM messages ORDER BY timestamp DESC');
        const [bookings] = await pool.query('SELECT * FROM bookings ORDER BY timestamp DESC');
        
        res.status(200).json({ subscribers, messages, bookings });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch administrative data.' });
    }
});

// Delete specific item
app.post('/api/admin/delete', verifyAdmin, async (req, res) => {
    const { type, id } = req.body;

    if (!type || id === undefined) {
        return res.status(400).json({ error: 'Missing parameters type or id.' });
    }

    const allowedTypes = ['subscribers', 'messages', 'bookings'];
    if (!allowedTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid type specified.' });
    }

    try {
        if (type === 'subscribers') {
            await pool.query('DELETE FROM subscribers WHERE email = ?', [id]);
        } else {
            await pool.query(`DELETE FROM \`${type}\` WHERE id = ?`, [parseInt(id)]);
        }
        res.status(200).json({ message: 'Record deleted successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database query failed during deletion.' });
    }
});

// Serve admin.html (static page, protected at frontend and backend endpoints)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'admin.html'));
});

// Fallback error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start Server
async function startServer() {
    await initDB();
    app.listen(PORT, () => {
        console.log(`==================================================`);
        console.log(`  Blink Express Server is live at: http://localhost:${PORT}`);
        console.log(`  Connected database: MySQL (XAMPP localhost)`);
        console.log(`==================================================`);
    });
}

startServer();
