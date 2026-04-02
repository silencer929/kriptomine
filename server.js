console.log('Loading server.js at', new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const socketIo = require('socket.io');
const http = require('http');
const csurf = require('csurf');
const cookieParser = require('cookie-parser');
const mysql = require('mysql2/promise');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://www.cryptomarketsafrica.com'],
    credentials: true
  }
});

// Database configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z'
});

// Env & config validation (fail fast for required secrets)
const REQUIRED_ENVS = ['JWT_SECRET', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingEnvs = REQUIRED_ENVS.filter(k => !process.env[k]);
if (missingEnvs.length > 0) {
  console.error('Missing required environment variables:', missingEnvs);
  process.exit(1);
}

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const MPESA_PASSKEY = process.env.MPESA_PASSKEY;
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE;
const MPESA_API_URL = process.env.MPESA_API_URL || 'https://api.safaricom.co.ke';
const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL || 'https://www.cryptomarketsafrica.com/api/mpesa-callback';

// PayHero configuration
const PAYHERO_BASE_URL = process.env.PAYHERO_BASE_URL || 'https://backend.payhero.co.ke';
const PAYHERO_USERNAME = process.env.PAYHERO_USERNAME;
const PAYHERO_PASSWORD = process.env.PAYHERO_PASSWORD;
const PAYHERO_CHANNEL_ID = process.env.PAYHERO_CHANNEL_ID ? parseInt(process.env.PAYHERO_CHANNEL_ID, 10) : null;
const PAYHERO_CALLBACK_URL = process.env.PAYHERO_CALLBACK_URL || 'https://www.cryptomarketsafrica.com/api/payhero-callback';

// Log non-sensitive environment debug info (do NOT log secrets)
console.log('Server config:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  db: { host: process.env.DB_HOST || 'localhost', name: process.env.DB_NAME },
  payhero: {
    baseUrl: PAYHERO_BASE_URL,
    channelId: PAYHERO_CHANNEL_ID ? 'Set' : 'Not set',
    callbackUrl: PAYHERO_CALLBACK_URL
  }
});

// Middleware setup
app.use(cors({
  origin: ['http://localhost:3000', 'https://www.cryptomarketsafrica.com'],
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "http://localhost:3000", "https://www.cryptomarketsafrica.com"],
      styleSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "http://localhost:3000", "https://www.cryptomarketsafrica.com", 'ws://localhost:3000', "wss://cryptomarketsafrica.com"],
      scriptSrcAttr: ["'none'"]
    }
  }
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));
app.use(csurf({ cookie: { secure: process.env.NODE_ENV === 'production', sameSite: 'Strict' } }));

// Debug middleware for all requests (avoid logging secrets)
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  const allowedMethods = ['GET', 'POST'];
  if (!allowedMethods.includes(req.method) && req.url.startsWith('/api')) {
    console.error(`Method ${req.method} not allowed for ${req.url}`);
    return res.status(405).json({ error: 'Method Not Allowed', allowed: allowedMethods });
  }
  next();
});

// Helper: MPESA access token (Daraja) - kept for backward compatibility
async function getMpesaAccessToken() {
  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET) {
    console.error('M-Pesa credentials missing');
    throw new Error('M-Pesa credentials missing');
  }
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
  const maxRetries = 3;
  let attempt = 1;
  while (attempt <= maxRetries) {
    try {
      console.log(`Fetching M-Pesa access token (attempt ${attempt}/${maxRetries})`);
      const response = await axios.get(`${MPESA_API_URL}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${auth}` },
        timeout: 10000
      });
      if (!response.data.access_token) throw new Error('No access token in response');
      return response.data.access_token;
    } catch (err) {
      const errorMsg = err.response?.data?.errorMessage || err.response?.data?.error || err.message;
      console.error(`M-Pesa auth error (attempt ${attempt}/${maxRetries}):`, errorMsg);
      if (attempt === maxRetries) {
        throw new Error(`Failed to get M-Pesa access token after ${maxRetries} attempts: ${errorMsg}`);
      }
      attempt++;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Helper: PayHero Basic Auth header
function getPayheroBasicAuthHeader() {
  if (!PAYHERO_USERNAME || !PAYHERO_PASSWORD) {
    throw new Error('PayHero credentials not configured');
  }
  const token = Buffer.from(`${PAYHERO_USERNAME}:${PAYHERO_PASSWORD}`).toString('base64');
  return `Basic ${token}`;
}

// JWT verification middleware
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  if (!token) {
    console.error('No token provided for request:', req.url);
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error(`Token verification failed for ${req.url}:`, err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function verifyAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    console.error(`Non-admin access attempt for ${req.url} by ${req.user?.username || 'unknown'}`);
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// CSRF Token
app.get('/api/csrf-token', (req, res) => {
  try {
    const csrfToken = req.csrfToken();
    res.json({ csrfToken });
  } catch (err) {
    console.error(`CSRF token generation failed for ${req.url}:`, err.message);
    res.status(500).json({ error: 'CSRF token generation failed' });
  }
});

// Login (uses bcrypt)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt: username=${username}`);
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      console.log(`Invalid credentials for ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      console.log(`Invalid credentials for ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ username: user.username, is_admin: !!user.is_admin }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, is_admin: !!user.is_admin });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Signup (hash password)
app.post('/api/signup', async (req, res) => {
  const { username, password, mobile } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.execute('INSERT INTO users (username, password, mobile, balance, is_admin) VALUES (?, ?, ?, ?, ?)', [username, hash, mobile, 0.00, 0]);
    console.log(`Signup successful for ${username}`);
    res.json({ message: 'Sign-up successful. Please log in.' });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(400).json({ error: 'Username already exists or invalid data' });
  }
});

// Test route
app.get('/api/test-route', (req, res) => {
  res.json({ message: 'Test route working' });
});

// Admin: fetch users
app.get('/api/admin/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT username, mobile, balance, is_admin, portfolio FROM users ORDER BY username');
    const users = rows.map(row => ({
      username: row.username,
      mobile: row.mobile || 'Not set',
      balance: parseFloat(row.balance) || 0,
      is_admin: !!row.is_admin,
      portfolio: typeof row.portfolio === 'string' && row.portfolio ? JSON.parse(row.portfolio) : (row.portfolio || {})
    }));
    res.json(users);
  } catch (err) {
    console.error('Admin users fetch error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Portfolio
app.get('/api/portfolio', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT username, mobile, balance, is_admin, portfolio FROM users WHERE username = ?', [req.user.username]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = rows[0];
    const balance = user.balance !== null ? parseFloat(user.balance) : 0.00;
    if (isNaN(balance)) {
      return res.status(500).json({ error: 'Invalid balance data' });
    }
    const portfolio = typeof user.portfolio === 'string' && user.portfolio ? JSON.parse(user.portfolio) : (user.portfolio || {
      bitcoin: 0, ethereum: 0, ripple: 0, litecoin: 0, dogecoin: 0, tether: 0
    });
    res.json({
      username: user.username,
      mobile: user.mobile || 'Not set',
      balance,
      portfolio,
      is_admin: !!user.is_admin
    });
  } catch (err) {
    console.error(`Portfolio error for ${req.user.username}:`, err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Deposit via PayHero STK Push
 * Replaces previous Daraja STK push flow.
 *
 * Expects:
 *  - amount (number)
 *  - phoneNumber (string) (format accepted by PayHero)
 *
 * Stores transaction with status = 'pending' and reference returned by PayHero.
 */
app.post('/api/deposit', verifyToken, async (req, res) => {
  const { amount, phoneNumber } = req.body;
  const depositAmount = parseFloat(amount);

  console.log(`Deposit attempt for ${req.user.username}: amount=${depositAmount}`);

  if (isNaN(depositAmount) || depositAmount <= 0) {
    console.error(`Invalid deposit amount: ${amount}`);
    return res.status(400).json({ error: 'Invalid deposit amount' });
  }
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    console.error('Invalid phone number provided');
    return res.status(400).json({ error: 'Invalid phone number' });
  }
  if (!PAYHERO_CHANNEL_ID) {
    console.error('PAYHERO_CHANNEL_ID not configured');
    return res.status(500).json({ error: 'Payment channel not configured' });
  }

  try {
    const externalReference = `CMP-${req.user.username}-${Date.now()}`;
    const body = {
      amount: Math.floor(depositAmount), // PayHero expects integer amounts
      phone_number: phoneNumber,
      channel_id: PAYHERO_CHANNEL_ID,
      provider: 'm-pesa',
      external_reference: externalReference,
      customer_name: req.user.username,
      callback_url: PAYHERO_CALLBACK_URL
    };

    const response = await axios.post(
      `${PAYHERO_BASE_URL}/api/v2/payments`,
      body,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: getPayheroBasicAuthHeader()
        },
        timeout: 15000
      }
    );

    const data = response.data || {};

    if (data && data.success) {
      const phReference = data.reference || externalReference;
      const checkoutRequestId = data.CheckoutRequestID || null;

      // Persist transaction as pending
      await pool.execute(
        'INSERT INTO transactions (username, type, amount, status, reference, currency) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.username, 'deposit', depositAmount, 'pending', phReference, 'KES']
      );

      console.log(`PayHero STK Push queued for ${req.user.username} reference=${phReference}`);

      return res.json({
        message: 'M-Pesa payment initiated via PayHero',
        success: true,
        reference: phReference,
        checkoutRequestId
      });
    } else {
      console.error('PayHero STK Push initiation failed:', data);
      return res.status(400).json({ error: 'Payment initiation failed', details: data });
    }
  } catch (err) {
    console.error('PayHero STK Push error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Server error initiating payment' });
  }
});

/**
 * PayHero callback endpoint
 * PayHero will POST status updates to this URL. Adjust the path in PAYHERO_CALLBACK_URL accordingly.
 * The shape of the callback can vary; we guard defensively.
 */
app.post('/api/payhero-callback', async (req, res) => {
  try {
    const body = req.body || {};
    // Defensive access. PayHero sample bodies wrap response content under various keys.
    const reference = body.reference || body.external_reference || body.data?.reference || body.data?.external_reference;
    const status = body.status || body.data?.status || body.response?.status || body.response?.ResultCode;
    const providerRef = body.provider_reference || body.mpesa_receipt || body.response?.MpesaReceiptNumber;

    if (!reference) {
      console.error('PayHero callback missing reference:', body);
      return res.status(400).send('Missing reference');
    }

    // Normalize status values if necessary
    // PayHero statuses may be 'SUCCESS', 'FAILED', 'QUEUED', etc.
    const normalizedStatus = typeof status === 'string' ? status.toUpperCase() : status;

    // Update DB transaction according to status
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const [rows] = await conn.query('SELECT id, username, amount, status FROM transactions WHERE reference = ? LIMIT 1', [reference]);
      if (rows.length === 0) {
        // If not found by reference, try CheckoutRequestID or other identifiers
        const altRef = body.CheckoutRequestID || body.checkout_request_id || body.data?.CheckoutRequestID;
        if (altRef) {
          const [altRows] = await conn.query('SELECT id, username, amount, status FROM transactions WHERE reference = ? OR transaction_id = ? LIMIT 1', [altRef, altRef]);
          if (altRows.length === 0) {
            await conn.rollback();
            console.error('PayHero callback: no matching transaction for reference or altRef', reference, altRef);
            return res.status(404).send('Transaction not found');
          }
          rows.push(...altRows);
        } else {
          await conn.rollback();
          console.error('PayHero callback: no matching transaction for reference', reference);
          return res.status(404).send('Transaction not found');
        }
      }

      const tx = rows[0];
      if (normalizedStatus === 'SUCCESS' || normalizedStatus === 'COMPLETED') {
        if (tx.status !== 'completed') {
          await conn.query('UPDATE transactions SET status = ?, transaction_id = ? WHERE id = ?', ['completed', providerRef || reference, tx.id]);
          await conn.query('UPDATE users SET balance = balance + ? WHERE username = ?', [tx.amount, tx.username]);
          const [balRows] = await conn.query('SELECT balance FROM users WHERE username = ?', [tx.username]);
          await conn.commit();
          const newBalance = balRows[0] ? parseFloat(balRows[0].balance) : null;
          io.emit('deposit_update', { username: tx.username, amount: parseFloat(tx.amount), newBalance });
          console.log(`PayHero callback processed: ${reference} SUCCESS for ${tx.username}`);
          return res.status(200).send('Callback processed');
        } else {
          await conn.rollback();
          console.log('PayHero callback: transaction already completed:', reference);
          return res.status(200).send('Already processed');
        }
      } else if (normalizedStatus === 'FAILED' || normalizedStatus === 'REJECTED') {
        await conn.query('UPDATE transactions SET status = ? WHERE id = ?', ['failed', tx.id]);
        await conn.commit();
        io.emit('deposit_update', { username: tx.username, amount: parseFloat(tx.amount), newBalance: null, status: 'failed' });
        console.log(`PayHero callback processed: ${reference} FAILED for ${tx.username}`);
        return res.status(200).send('Callback processed');
      } else {
        // QUEUED or pending states — leave as pending
        await conn.rollback();
        console.log(`PayHero callback: status ${normalizedStatus} for ${reference} — no DB changes`);
        return res.status(200).send('Queued/No action');
      }
    } catch (dbErr) {
      if (conn) {
        try { await conn.rollback(); } catch (e) { console.error('Rollback error:', e.message); }
      }
      console.error('PayHero callback DB error:', dbErr.message);
      return res.status(500).send('Server error');
    } finally {
      if (conn) conn.release();
    }
  } catch (err) {
    console.error('PayHero callback processing error:', err.message);
    return res.status(500).send('Callback processing failed');
  }
});

/**
 * checkTransactionStatus(reference)
 * Polls PayHero transaction-status API and reconciles transaction in DB.
 * Returns an object describing the result.
 */
async function checkTransactionStatus(reference) {
  if (!reference) throw new Error('reference required');

  try {
    const url = `${PAYHERO_BASE_URL}/api/v2/transaction-status?reference=${encodeURIComponent(reference)}`;
    const response = await axios.get(url, {
      headers: { Authorization: getPayheroBasicAuthHeader() },
      timeout: 10000
    });

    const data = response.data || {};
    const status = data.status || data.response?.Status;
    const providerRef = data.provider_reference || data.third_party_reference || data.response?.MpesaReceiptNumber || null;
    const remoteAmount = data.amount || data.response?.Amount || null;
    const normalizedStatus = typeof status === 'string' ? status.toUpperCase() : status;

    if (!normalizedStatus) {
      return { updated: false, status: 'NOT_FOUND', details: data };
    }

    // DB reconciliation
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const [rows] = await conn.query('SELECT id, username, amount, status FROM transactions WHERE reference = ? LIMIT 1', [reference]);
      if (rows.length === 0) {
        // try alternative lookups
        const [altRows] = await conn.query('SELECT id, username, amount, status FROM transactions WHERE transaction_id = ? OR reference = ? LIMIT 1', [reference, reference]);
        if (altRows.length === 0) {
          await conn.rollback();
          return { updated: false, status: 'NOT_FOUND', details: 'No transaction in DB for reference' };
        }
        rows.push(...altRows);
      }

      const tx = rows[0];
      if (!tx) {
        await conn.rollback();
        return { updated: false, status: 'NOT_FOUND', details: 'No transaction record' };
      }

      if (tx.status === 'completed') {
        await conn.rollback();
        return { updated: false, status: 'ALREADY_COMPLETED', details: 'Transaction already completed in DB' };
      }

      if (normalizedStatus === 'SUCCESS' || normalizedStatus === 'COMPLETED') {
        await conn.query('UPDATE transactions SET status = ?, transaction_id = ? WHERE id = ?', ['completed', providerRef || reference, tx.id]);
        await conn.query('UPDATE users SET balance = balance + ? WHERE username = ?', [tx.amount, tx.username]);
        const [balRows] = await conn.query('SELECT balance FROM users WHERE username = ?', [tx.username]);
        await conn.commit();
        const newBalance = balRows[0] ? parseFloat(balRows[0].balance) : null;
        io.emit('deposit_update', { username: tx.username, amount: parseFloat(tx.amount), newBalance });
        return { updated: true, status: 'SUCCESS', details: { providerRef, newBalance } };
      } else if (normalizedStatus === 'FAILED' || normalizedStatus === 'REJECTED') {
        await conn.query('UPDATE transactions SET status = ? WHERE id = ?', ['failed', tx.id]);
        await conn.commit();
        return { updated: true, status: 'FAILED', details: data };
      } else {
        // QUEUED or other pending statuses
        await conn.rollback();
        return { updated: false, status: 'QUEUED', details: data };
      }
    } catch (dbErr) {
      if (conn) {
        try { await conn.rollback(); } catch (e) { console.error('Rollback error:', e.message); }
      }
      console.error('DB error in checkTransactionStatus:', dbErr.message);
      return { updated: false, status: 'ERROR', details: dbErr.message };
    } finally {
      if (conn) conn.release();
    }
  } catch (err) {
    console.error('PayHero transaction-status error:', err.response?.data || err.message);
    return { updated: false, status: 'ERROR', details: err.message };
  }
}

// Endpoint to trigger status check for a specific reference (protected)
app.post('/api/check-transaction', verifyToken, async (req, res) => {
  const { reference } = req.body;
  if (!reference) return res.status(400).json({ error: 'reference required' });

  try {
    // allow admin or owner to trigger
    const [rows] = await pool.query('SELECT username FROM transactions WHERE reference = ? LIMIT 1', [reference]);
    if (rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });
    const txUser = rows[0].username;
    if (!req.user.is_admin && req.user.username !== txUser) {
      return res.status(403).json({ error: 'Not authorized to check this transaction' });
    }

    const result = await checkTransactionStatus(reference);
    res.json(result);
  } catch (err) {
    console.error('check-transaction endpoint error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// MPESA daraja callback (kept for backward compatibility)
app.post('/api/mpesa-callback', async (req, res) => {
  try {
    const stkCallback = req.body?.Body?.stkCallback;
    if (!stkCallback) {
      console.error('Malformed M-Pesa daraja callback:', req.body);
      return res.status(400).send('Malformed callback');
    }
    const { ResultCode, ResultDesc, CallbackMetadata } = stkCallback;
    console.log(`M-Pesa daraja callback: ResultCode=${ResultCode}, ResultDesc=${ResultDesc}`);

    if (String(ResultCode) === '0') {
      if (!CallbackMetadata?.Item) {
        console.error('Missing CallbackMetadata.Item in daraja callback');
        return res.status(400).send('Missing metadata');
      }
      const amountItem = CallbackMetadata.Item.find(i => i.Name === 'Amount');
      const mpesaReceiptItem = CallbackMetadata.Item.find(i => i.Name === 'MpesaReceiptNumber');
      const checkoutRequestItem = CallbackMetadata.Item.find(i => i.Name === 'CheckoutRequestID');

      const amount = amountItem?.Value;
      const transactionId = mpesaReceiptItem?.Value;
      const reference = checkoutRequestItem?.Value;

      if (!reference) {
        console.error('Daraja callback missing CheckoutRequestID', req.body);
        return res.status(400).send('Missing reference');
      }

      let conn;
      try {
        conn = await pool.getConnection();
        await conn.beginTransaction();
        const [userRows] = await conn.query('SELECT username FROM transactions WHERE reference = ? AND status = ? LIMIT 1', [reference, 'pending']);
        if (userRows.length === 0) {
          await conn.rollback();
          console.error(`No pending transaction found for reference: ${reference}`);
          return res.status(400).send('No matching transaction');
        }
        const username = userRows[0].username;
        await conn.query('UPDATE users SET balance = balance + ? WHERE username = ?', [amount, username]);
        await conn.query('UPDATE transactions SET status = ?, transaction_id = ? WHERE reference = ? AND status = ?', ['completed', transactionId, reference, 'pending']);
        const [balanceRows] = await conn.query('SELECT balance FROM users WHERE username = ?', [username]);
        await conn.commit();
        io.emit('deposit_update', { username, amount: parseFloat(amount), newBalance: parseFloat(balanceRows[0].balance) });
        return res.status(200).send('Callback processed');
      } catch (err) {
        if (conn) {
          try { await conn.rollback(); } catch (e) { console.error('Rollback error:', e.message); }
        }
        console.error('Daraja callback error:', err.message);
        return res.status(500).send('Callback processing failed');
      } finally {
        if (conn) conn.release();
      }
    } else {
      console.error('M-Pesa daraja callback failed:', ResultDesc);
      return res.status(400).send('Callback failed');
    }
  } catch (err) {
    console.error('MPESA daraja callback processing error:', err.message);
    return res.status(500).send('Callback processing failed');
  }
});

// Withdraw
app.post('/api/withdraw', verifyToken, async (req, res) => {
  const { amount, currency, destination } = req.body;
  const withdrawAmount = parseFloat(amount);
  if (isNaN(withdrawAmount) || withdrawAmount < 100 || !currency || !destination) {
    console.error(`Invalid withdrawal: amount=${amount}, currency=${currency}, destination=${destination}`);
    return res.status(400).json({ error: 'Invalid withdrawal amount (min KES 100), currency, or destination' });
  }
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const [userRows] = await conn.query('SELECT balance, portfolio FROM users WHERE username = ?', [req.user.username]);
    if (userRows.length === 0) {
      await conn.rollback();
      console.error(`User not found: ${req.user.username}`);
      return res.status(404).json({ error: 'User not found' });
    }
    const { balance } = userRows[0];
    if (parseFloat(balance) < withdrawAmount) {
      await conn.rollback();
      console.error(`Insufficient balance for ${req.user.username}: balance=${balance}, requested=${withdrawAmount}`);
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    const reference = `WD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    await conn.query(
      'INSERT INTO withdrawal_requests (userId, reference, currency, amount, destination, status) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.username, reference, currency, withdrawAmount, destination, 'pending']
    );
    await conn.query(
      'INSERT INTO transactions (username, type, amount, status, currency, reference, destination) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.username, 'withdrawal', withdrawAmount, 'pending', currency, reference, destination]
    );
    await conn.commit();
    io.emit('newWithdrawal', {
      _id: reference,
      userId: { username: req.user.username },
      reference,
      currency,
      amount: withdrawAmount,
      destination,
      status: 'pending'
    });
    res.json({ success: true, reference, status: 'pending' });
  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch (e) { console.error('Rollback error:', e.message); }
    }
    console.error('Withdrawal error:', err.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
});

// Transaction History
app.get('/api/history', verifyToken, async (req, res) => {
  try {
    let query = 'SELECT transaction_id, currency, amount, createdAt, reference FROM transactions WHERE username = ? ORDER BY createdAt DESC';
    let params = [req.user.username];
    if (req.user.is_admin) {
      query = 'SELECT transaction_id, currency, amount, createdAt, reference, username FROM transactions ORDER BY createdAt DESC';
      params = [];
    }
    const [rows] = await pool.query(query, params);
    const transactions = rows.map(row => ({
      transaction_id: row.transaction_id,
      currency: row.currency,
      amount: parseFloat(row.amount),
      date: row.createdAt,
      reference: row.reference
    }));
    res.json(transactions);
  } catch (err) {
    console.error('History error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get All Withdrawals
app.get('/api/admin/withdrawals', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT w._id, w.userId AS username, w.reference, w.currency, w.amount, w.destination, w.status, u.username AS user_username ' +
      'FROM withdrawal_requests w JOIN users u ON w.userId = u.username ORDER BY w.createdAt DESC'
    );
    const withdrawals = rows.map(row => ({
      _id: row._id,
      userId: { username: row.user_username },
      reference: row.reference,
      currency: row.currency,
      amount: parseFloat(row.amount),
      destination: row.destination,
      status: row.status
    }));
    res.json(withdrawals);
  } catch (err) {
    console.error('Admin withdrawals error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Approve/Reject Withdrawal
app.post('/api/admin/withdrawal/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  if (!['approve', 'reject'].includes(action)) {
    console.error(`Invalid action for withdrawal ${id}: ${action}`);
    return res.status(400).json({ error: 'Invalid action' });
  }
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const [withdrawalRows] = await conn.query(
      'SELECT userId, amount, currency, destination, reference FROM withdrawal_requests WHERE _id = ? AND status = ?',
      [id, 'pending']
    );
    if (withdrawalRows.length === 0) {
      await conn.rollback();
      console.error(`Withdrawal ${id} not found or not pending`);
      return res.status(404).json({ error: 'Withdrawal not found or not pending' });
    }
    const withdrawal = withdrawalRows[0];
    if (action === 'approve') {
      const [userRows] = await conn.query('SELECT balance FROM users WHERE username = ?', [withdrawal.userId]);
      if (userRows.length === 0 || parseFloat(userRows[0].balance) < withdrawal.amount) {
        await conn.rollback();
        console.error(`Insufficient balance or user not found for ${withdrawal.userId}`);
        return res.status(400).json({ error: 'Insufficient balance or user not found' });
      }
      await conn.query('UPDATE users SET balance = balance - ? WHERE username = ?', [withdrawal.amount, withdrawal.userId]);
      await conn.query('UPDATE transactions SET status = ? WHERE reference = ? AND type = ?', ['completed', withdrawal.reference, 'withdrawal']);
    } else {
      await conn.query('UPDATE transactions SET status = ? WHERE reference = ? AND type = ?', ['rejected', withdrawal.reference, 'withdrawal']);
    }
    await conn.query('UPDATE withdrawal_requests SET status = ? WHERE _id = ?', [action === 'approve' ? 'completed' : 'rejected', id]);
    const [newBalanceRows] = await conn.query('SELECT balance FROM users WHERE username = ?', [withdrawal.userId]);
    await conn.commit();
    io.emit('withdrawalUpdate', {
      _id: id,
      userId: { username: withdrawal.userId },
      reference: withdrawal.reference,
      currency: withdrawal.currency,
      amount: parseFloat(withdrawal.amount),
      destination: withdrawal.destination,
      status: action === 'approve' ? 'completed' : 'rejected'
    });
    if (action === 'approve') {
      io.emit('portfolio_update', { username: withdrawal.userId, newBalance: parseFloat(newBalanceRows[0].balance) });
    }
    res.json({ status: action === 'approve' ? 'completed' : 'rejected' });
  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch (e) { console.error('Rollback error:', e.message); }
    }
    console.error(`Admin withdrawal ${id} error:`, err.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
});

// Admin: Block/Remove User
app.post('/api/admin/user/:id', verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  if (!['block', 'remove'].includes(action)) {
    console.error(`Invalid action for user ${id}: ${action}`);
    return res.status(400).json({ error: 'Invalid action' });
  }
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    if (action === 'block') {
      await conn.query('UPDATE users SET is_blocked = ? WHERE username = ?', [1, id]);
      console.log(`User ${id} blocked by admin ${req.user.username}`);
    } else {
      await conn.query('DELETE FROM users WHERE username = ?', [id]);
      console.log(`User ${id} removed by admin ${req.user.username}`);
    }
    await conn.commit();
    io.emit('userUpdate', { username: id, action });
    res.json({ status: action });
  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch (e) { console.error('Rollback error:', e.message); }
    }
    console.error(`Admin user ${id} error:`, err.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
});

// Start Mining
app.post('/api/start-mining', verifyToken, async (req, res) => {
  const { coin } = req.body;
  const prices = {
    BTC: 5000,
    ETH: 4500,
    LTC: 3000,
    XRP: 2000,
    DOGE: 1500,
    USDT: 7000
  };
  const price = prices[coin];
  if (!price) {
    console.error(`Invalid coin: ${coin}`);
    return res.status(400).json({ error: 'Invalid coin' });
  }
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const [userRows] = await conn.query('SELECT balance, portfolio FROM users WHERE username = ?', [req.user.username]);
    if (userRows.length === 0) {
      await conn.rollback();
      console.error(`User not found: ${req.user.username}`);
      return res.status(404).json({ error: 'User not found' });
    }
    const { balance, portfolio } = userRows[0];
    if (parseFloat(balance) < price) {
      await conn.rollback();
      console.error(`Insufficient balance for ${req.user.username}: balance=${balance}, required=${price}`);
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    const parsedPortfolio = typeof portfolio === 'string' && portfolio ? JSON.parse(portfolio) : (portfolio || {});
    const updatedPortfolio = { ...parsedPortfolio, [coin.toLowerCase()]: (parsedPortfolio[coin.toLowerCase()] || 0) + 0.01 };
    await conn.query('UPDATE users SET balance = balance - ?, portfolio = ? WHERE username = ?', [price, JSON.stringify(updatedPortfolio), req.user.username]);
    await conn.query(
      'INSERT INTO transactions (username, type, amount, status, currency) VALUES (?, ?, ?, ?, ?)',
      [req.user.username, 'mining', price, 'completed', coin]
    );
    const [newBalanceRows] = await conn.query('SELECT balance FROM users WHERE username = ?', [req.user.username]);
    await conn.commit();
    io.emit('portfolio_update', { username: req.user.username, newBalance: parseFloat(newBalanceRows[0].balance) });
    res.json({ success: true, newBalance: parseFloat(newBalanceRows[0].balance) });
  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch (e) { console.error('Rollback error:', e.message); }
    }
    console.error('Mining error:', err.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
});

// Serve HTML Files
['portfolio.html', 'trade.html', 'history.html', 'profits.html', 'referrals.html', 'admin.html', 'manage-users.html', 'manage-withdrawals.html', 'view-transactions.html', 'deposit.html', 'payment-method.html'].forEach(file => {
  app.get(`/${file}`, (req, res) => {
    const filePath = path.join(__dirname, 'public', file);
    if (fs.existsSync(filePath)) {
      console.log(`Serving ${file}`);
      res.sendFile(filePath);
    } else {
      console.error(`404: ${file} not found at ${filePath}`);
      res.status(404).send(`404 - File not found: ${file}`);
    }
  });
});

// Global Error Handling
app.use((err, req, res, next) => {
  console.error(`Global error for ${req.method} ${req.url}:`, err.message);
  if (err.code === 'EBADCSRFTOKEN') {
    console.error('CSRF token validation failed');
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  res.status(500).json({ error: 'Server error' });
});

// Start server
const PORT = parseInt(process.env.PORT, 10) || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
