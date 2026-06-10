const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());

// ── DATABASE ──
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:nXgIujlxNvacSuXglvCYnSKMFvvNmlBc@acela.proxy.rlwy.net:48342/railway',
  ssl: { rejectUnauthorized: false }
});

// ── GMAIL ──
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'skatedelivery007@gmail.com',
    pass: 'hzps fjgy etdi syof'
  }
});

// ── INIT DATABASE TABLES ──
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_id VARCHAR(100) UNIQUE NOT NULL,
      customer_email VARCHAR(200) NOT NULL,
      product VARCHAR(100) NOT NULL,
      variant VARCHAR(200),
      quantity INTEGER DEFAULT 1,
      total_paid VARCHAR(50),
      status VARCHAR(50) DEFAULT 'pending',
      content TEXT,
      error TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      ticket_id VARCHAR(100) UNIQUE NOT NULL,
      customer_email VARCHAR(200) NOT NULL,
      order_id VARCHAR(100),
      title VARCHAR(200),
      message TEXT,
      status VARCHAR(50) DEFAULT 'open',
      admin_reply TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('[DB] Tables ready!');
}

// ── HEALTH CHECK ──
app.get('/', (req, res) => {
  res.json({ status: 'Skaters server running', time: new Date().toISOString() });
});

// ── CREATE ORDER ──
app.post('/api/order', async (req, res) => {
  const { orderId, customerEmail, product, variant, quantity, totalPaid } = req.body;
  if (!orderId || !customerEmail || !product) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    await pool.query(
      'INSERT INTO orders (order_id, customer_email, product, variant, quantity, total_paid, status) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (order_id) DO NOTHING',
      [orderId, customerEmail, product, variant, quantity || 1, totalPaid, 'processing']
    );
    // Send confirmation email to customer
    await transporter.sendMail({
      from: '"Skaters Shop" <skatedelivery007@gmail.com>',
      to: customerEmail,
      subject: 'Order Received — Skaters Shop',
      html: '<div style="font-family:Arial;background:#050a14;color:#fff;padding:32px;border-radius:12px;max-width:500px;margin:0 auto"><div style="background:#2563eb;padding:20px;border-radius:8px;text-align:center;margin-bottom:24px"><h1 style="margin:0">Skaters</h1></div><h2 style="color:#2563eb">Order Confirmed! ✓</h2><p style="color:#7a90b0">Your order <strong style="color:#fff">' + orderId + '</strong> has been received.</p><p style="color:#7a90b0">Product: <strong style="color:#fff">' + product + ' ' + (variant || '') + '</strong></p><p style="color:#7a90b0">We are processing your order. You will receive your product shortly.</p><div style="background:#090f1e;border:1px solid #1a3a6b;border-radius:8px;padding:16px;margin-top:20px"><p style="color:#7a90b0;font-size:12px;margin:0">For support, reply to this email with your Order ID.</p></div><p style="color:#444;font-size:12px;text-align:center;margin-top:24px">© 2026 Skaters. All rights reserved.</p></div>'
    });
    console.log('[ORDER] Created:', orderId);
    res.json({ success: true, orderId });
  } catch (err) {
    console.error('[ORDER] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── SUBMIT SUPPORT TICKET ──
app.post('/api/ticket', async (req, res) => {
  const { customerEmail, orderId, title, message } = req.body;
  if (!customerEmail || !message) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    const ticketId = 'TKT-' + Date.now();
    await pool.query(
      'INSERT INTO tickets (ticket_id, customer_email, order_id, title, message) VALUES ($1,$2,$3,$4,$5)',
      [ticketId, customerEmail, orderId || null, title || 'Support Request', message]
    );
    // Notify admin
    await transporter.sendMail({
      from: '"Skaters Support" <skatedelivery007@gmail.com>',
      to: 'skatedelivery007@gmail.com',
      subject: '[NEW TICKET] ' + (title || 'Support Request') + ' — ' + ticketId,
      text: 'New ticket from: ' + customerEmail + '\nOrder ID: ' + (orderId || 'N/A') + '\nMessage: ' + message
    });
    console.log('[TICKET] Created:', ticketId);
    res.json({ success: true, ticketId });
  } catch (err) {
    console.error('[TICKET] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: GET ALL ORDERS ──
app.get('/api/admin/orders', async (req, res) => {
  const { password } = req.query;
  if (password !== 'Yaounde237@&') return res.status(401).json({ error: 'Unauthorized' });
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 100');
    res.json({ orders: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: GET ALL TICKETS ──
app.get('/api/admin/tickets', async (req, res) => {
  const { password } = req.query;
  if (password !== 'Yaounde237@&') return res.status(401).json({ error: 'Unauthorized' });
  try {
    const result = await pool.query('SELECT * FROM tickets ORDER BY created_at DESC LIMIT 100');
    res.json({ tickets: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: REPLY TO TICKET ──
app.post('/api/admin/reply', async (req, res) => {
  const { password, ticketId, reply } = req.body;
  if (password !== 'Yaounde237@&') return res.status(401).json({ error: 'Unauthorized' });
  try {
    const ticket = await pool.query('SELECT * FROM tickets WHERE ticket_id=$1', [ticketId]);
    if (ticket.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    const t = ticket.rows[0];
    await pool.query(
      'UPDATE tickets SET admin_reply=$1, status=$2, updated_at=NOW() WHERE ticket_id=$3',
      [reply, 'answered', ticketId]
    );
    // Send reply to customer
    await transporter.sendMail({
      from: '"Skaters Support" <skatedelivery007@gmail.com>',
      to: t.customer_email,
      subject: 'Reply to your ticket — ' + ticketId,
      html: '<div style="font-family:Arial;background:#050a14;color:#fff;padding:32px;border-radius:12px;max-width:500px;margin:0 auto"><div style="background:#2563eb;padding:20px;border-radius:8px;text-align:center;margin-bottom:24px"><h1 style="margin:0">Skaters Support</h1></div><p style="color:#7a90b0">Ticket: <strong style="color:#fff">' + ticketId + '</strong></p><p style="color:#7a90b0">Your message: <em>' + t.message + '</em></p><div style="background:#090f1e;border:1px solid #2563eb;border-radius:8px;padding:16px;margin-top:16px"><p style="color:#7a90b0;font-size:12px;margin:0 0 8px;text-transform:uppercase;">Our reply</p><p style="color:#fff;margin:0">' + reply + '</p></div><p style="color:#444;font-size:12px;text-align:center;margin-top:24px">© 2026 Skaters.</p></div>'
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: UPDATE ORDER STATUS ──
app.post('/api/admin/order-status', async (req, res) => {
  const { password, orderId, status } = req.body;
  if (password !== 'Yaounde237@&') return res.status(401).json({ error: 'Unauthorized' });
  try {
    await pool.query('UPDATE orders SET status=$1, updated_at=NOW() WHERE order_id=$2', [status, orderId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── START ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log('Skaters server on port', PORT);
  await initDB();
  transporter.verify((err) => {
    if (err) console.error('[EMAIL] Error:', err.message);
    else console.log('[EMAIL] Gmail ready!');
  });
});
