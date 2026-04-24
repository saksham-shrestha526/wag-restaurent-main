import express from 'express';
import session from 'express-session';
import sqlite3Store from 'connect-sqlite3';
import cors from 'cors';
import path from 'path';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import multer from 'multer';
import fs from 'fs';
import Stripe from 'stripe';
import { Resend } from 'resend';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import db, { DATA_DIR } from './src/lib/db';

// ============ NO EXTRA SEEDING – all seeding is inside db.ts ============

console.log('🔑 Env – GROQ:', !!process.env.GROQ_API_KEY, 'Resend:', !!process.env.RESEND_API_KEY);
console.log('📁 DATA_DIR:', DATA_DIR);

const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const SESSION_DB_DIR = DATA_DIR;
const SESSION_DB_FILENAME = 'sessions.sqlite';

async function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true;
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secret}&response=${token}`,
    });
    const data = await response.json();
    return data.success === true;
  } catch {
    return false;
  }
}

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many login attempts. Please wait 1 minute.' },
});

let stripeClient: Stripe | null = null;
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) { console.warn('STRIPE_SECRET_KEY missing'); return null; }
  if (!stripeClient) stripeClient = new Stripe(key);
  return stripeClient;
}

let resendClient: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!resendClient && key) resendClient = new Resend(key);
  return resendClient;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase())) {
      return cb(null, true);
    }
    cb(new Error('Format not supported. Use JPG, PNG or WebP.'));
  },
});

// ============ EMAIL: RESEND + GMAIL FALLBACK ============
const gmailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USERNAME || '',
    pass: process.env.MAIL_PASSWORD || '',
  },
  family: 4,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

const sendMailAsync = async (to: string, subject: string, html: string) => {
  const resend = getResend();
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: `WAG Restaurant <onboarding@resend.dev>`,
        to,
        subject,
        html,
      });
      if (error) throw new Error(error.message);
      console.log(`✅ Email via Resend to ${to} (id: ${data?.id})`);
      return data;
    } catch (err: any) {
      console.error(`❌ Resend failed:`, err.message);
    }
  } else {
    console.log('⚠️ Resend not configured, falling back to Gmail');
  }

  try {
    const info = await gmailTransporter.sendMail({
      from: `"WAG Restaurant" <${process.env.MAIL_USERNAME}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Email via Gmail to ${to} (id: ${info.messageId})`);
    return info;
  } catch (err: any) {
    console.error(`❌ Gmail failed:`, err.message);
    throw err;
  }
};

console.log('📧 Email configured: Resend (primary) + Gmail (fallback)');

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

setInterval(() => {
  try {
    db.prepare(`DELETE FROM email_verifications WHERE expires_at < datetime('now')`).run();
    db.prepare(`DELETE FROM password_resets WHERE expires_at < datetime('now')`).run();
  } catch (e) {}
}, 60000);

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3001',
  process.env.FRONTEND_URL,
  process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : undefined,
].filter(Boolean) as string[];

async function startServer() {
  console.log('🚀 Starting WAG server...');
  const app = express();
  // ✅ FIXED: Port changed from 3005 to 3010 to match Vite proxy
  const PORT = parseInt(process.env.PORT || '3010', 10);
  const IS_PRODUCTION = process.env.NODE_ENV === 'production';

  app.set('trust proxy', 1);

  // Stripe webhook (raw body)
  app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(500).send('Webhook secret not configured');

    let event: Stripe.Event;
    try {
      const stripe = getStripe();
      if (!stripe) return res.status(500).send('Stripe not configured');
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error('Webhook Error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderNumber = session.metadata?.orderNumber;
      if (orderNumber) {
        db.prepare(`UPDATE orders SET payment_status = 'paid', payment_intent_id = ? WHERE order_number = ?`).run(
          session.payment_intent as string,
          orderNumber
        );
        console.log(`✅ Payment confirmed for Order: ${orderNumber}`);
      }
    }
    res.json({ received: true });
  });

  app.post('/api/test-email', async (req, res) => {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'Missing "to" email' });
    try {
      await sendMailAsync(to, 'Test Email from WAG', '<h1>Test</h1><p>If you see this, email works.</p>');
      res.json({ success: true, message: 'Email sent. Check logs.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin) || !IS_PRODUCTION) return callback(null, true);
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    })
  );

  const SQLiteStore = sqlite3Store(session);
  app.use(
    session({
      store: new SQLiteStore({
        db: SESSION_DB_FILENAME,
        dir: SESSION_DB_DIR,
        concurrentDB: true,
      }) as any,
      secret: process.env.SESSION_SECRET || 'wag-restaurant-master-key',
      name: 'wag_sid',
      resave: false,
      saveUninitialized: false,
      proxy: IS_PRODUCTION,
      rolling: true,
      cookie: {
        secure: IS_PRODUCTION,
        httpOnly: true,
        sameSite: IS_PRODUCTION ? 'none' : 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use('/uploads', express.static(UPLOAD_DIR));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), env: process.env.NODE_ENV });
  });

  if (!IS_PRODUCTION) {
    app.get('/api/debug-session', (req, res) => {
      res.json({
        sessionID: req.sessionID,
        userId: (req as any).session?.userId,
        role: (req as any).session?.userRole,
        cookies: req.headers.cookie,
      });
    });
  }

  app.get('/api/stripe-publishable-key', (_req, res) => {
    res.json({ publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || '' });
  });

  app.post('/api/create-payment-intent', async (req, res) => {
    const { amount } = req.body;
    try {
      const stripe = getStripe();
      if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (err: any) {
      console.error('Stripe Intent Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ============ AUTH ROUTES ============
  app.post('/api/register', async (req, res) => {
    const { name, email, password, phone = '', recaptchaToken } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }
    if (process.env.RECAPTCHA_SECRET_KEY && recaptchaToken) {
      const isValid = await verifyRecaptcha(recaptchaToken);
      if (!isValid) return res.status(400).json({ success: false, message: 'reCAPTCHA verification failed.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const existingUser = db.prepare('SELECT id, is_verified FROM users WHERE email = ?').get(email) as any;
    if (existingUser) {
      if (existingUser.is_verified) {
        return res.status(400).json({ success: false, message: 'Email already registered. Please log in.' });
      } else {
        db.prepare('DELETE FROM email_verifications WHERE email = ?').run(email);
        db.prepare('DELETE FROM users WHERE id = ?').run(existingUser.id);
      }
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const phoneDigits = phone.replace(/\D/g, '').slice(-4);
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const namePrefix = name.replace(/\s+/g, '').substring(0, 3).toUpperCase();
    const customerId = `WAG-${namePrefix}-${phoneDigits || randomPart}`;

    try {
      db.prepare(
        `INSERT INTO users (customer_id, name, nickname, email, password, phone, role, is_verified) VALUES (?, ?, ?, ?, ?, ?, 'user', 0)`
      ).run(customerId, name, name, email, hashedPassword, phone);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: 'Failed to create account. ' + err.message });
    }

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO email_verifications (email, code, expires_at) VALUES (?, ?, ?)').run(email, code, expiresAt);

    sendMailAsync(
      email,
      'Verify your email - WAG Luxury Dining',
      `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;">
          <h2 style="color:#b8860b;">Welcome to WAG!</h2>
          <p>Your email verification code is:</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#333;margin:16px 0;">${code}</div>
          <p style="color:#888;">This code expires in <strong>2 minutes</strong>. Do not share it with anyone.</p>
        </div>
      `
    ).catch(console.error);

    res.json({ success: true, message: 'Verification code sent to your email.', email });
  });

  app.post('/api/resend-verification', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required.' });
    const user = db.prepare('SELECT id FROM users WHERE email = ? AND is_verified = 0').get(email) as any;
    if (!user) return res.status(404).json({ success: false, message: 'No unverified account found.' });

    db.prepare('DELETE FROM email_verifications WHERE email = ?').run(email);
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO email_verifications (email, code, expires_at) VALUES (?, ?, ?)').run(email, code, expiresAt);

    sendMailAsync(
      email,
      'New Verification Code - WAG Luxury Dining',
      `<div style="font-family:sans-serif;"><h2>New Code</h2><p>Your new verification code is: <strong>${code}</strong></p><p>Expires in 2 minutes.</p></div>`
    ).catch(console.error);

    res.json({ success: true, message: 'New code sent.' });
  });

  app.post('/api/verify-email', (req, res) => {
    const { email, code } = req.body;
    const record = db.prepare('SELECT * FROM email_verifications WHERE email = ? AND code = ?').get(email, code) as any;
    if (!record) return res.status(400).json({ success: false, message: 'Invalid verification code.' });
    if (new Date(record.expires_at) < new Date()) {
      db.prepare('DELETE FROM email_verifications WHERE email = ?').run(email);
      return res.status(400).json({ success: false, message: 'Code expired. Please request a new code.' });
    }
    db.prepare('UPDATE users SET is_verified = 1 WHERE email = ?').run(email);
    db.prepare('DELETE FROM email_verifications WHERE email = ?').run(email);
    res.json({ success: true, message: 'Email verified! You can now log in.' });
  });

  app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = db.prepare('SELECT id, name FROM users WHERE email = ?').get(email) as any;
    if (!user) return res.status(404).json({ success: false, message: 'No account found with this email.' });
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    db.prepare('DELETE FROM password_resets WHERE email = ?').run(email);
    db.prepare('INSERT INTO password_resets (email, code, expires_at) VALUES (?, ?, ?)').run(email, code, expiresAt);
    sendMailAsync(
      email,
      'Password Reset Code - WAG Restaurant',
      `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;">
          <h2 style="color:#b8860b;">Password Reset</h2>
          <p>Your reset code is:</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#333;margin:16px 0;">${code}</div>
          <p style="color:#888;">This code expires in 10 minutes.</p>
        </div>
      `
    ).catch(console.error);
    res.json({ success: true, message: 'Reset code sent to your email.' });
  });

  app.post('/api/resend-reset-code', async (req, res) => {
    const { email } = req.body;
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;
    if (!user) return res.status(404).json({ success: false, message: 'No account found.' });
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    db.prepare('DELETE FROM password_resets WHERE email = ?').run(email);
    db.prepare('INSERT INTO password_resets (email, code, expires_at) VALUES (?, ?, ?)').run(email, code, expiresAt);
    sendMailAsync(
      email,
      'New Password Reset Code - WAG',
      `<p>Your new code: <strong>${code}</strong> (expires in 10 min)</p>`
    ).catch(console.error);
    res.json({ success: true, message: 'New code sent.' });
  });

  app.post('/api/verify-reset-code', (req, res) => {
    const { email, code } = req.body;
    const reset = db.prepare('SELECT * FROM password_resets WHERE email = ? AND code = ?').get(email, code) as any;
    if (!reset) return res.status(400).json({ success: false, message: 'Invalid reset code.' });
    if (new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'Reset code has expired.' });
    }
    res.json({ success: true });
  });

  app.post('/api/reset-password', async (req, res) => {
    const { email, code, password } = req.body;
    const reset = db.prepare('SELECT * FROM password_resets WHERE email = ? AND code = ?').get(email, code) as any;
    if (!reset || new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset code.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password = ? WHERE email = ?').run(hashedPassword, email);
    db.prepare('DELETE FROM password_resets WHERE email = ?').run(email);
    res.json({ success: true, message: 'Password updated successfully.' });
  });

  app.post('/api/login', loginLimiter, (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user) return res.status(401).json({ success: false, message: 'No account found with this email.' });
    if (!user.is_verified) {
      return res.status(401).json({ success: false, message: 'Please verify your email first. Check your inbox.' });
    }
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    (req as any).session.userId = user.id;
    (req as any).session.userRole = user.role;

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ success: false, message: 'Session error. Please try again.' });
      }
      res.json({
        success: true,
        user: {
          id: user.id,
          customer_id: user.customer_id,
          name: user.name,
          nickname: user.nickname,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url,
          phone: user.phone,
          loyalty_points: user.loyalty_points,
        },
      });
    });
  });

  app.post('/api/logout', (req, res) => {
    (req as any).session?.destroy((err: any) => {
      if (err) console.error('Logout error:', err);
      res.clearCookie('wag_sid', { path: '/' });
      res.json({ success: true });
    });
  });

  app.get('/api/me', (req, res) => {
    const userId = (req as any).session?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated.' });
    const user = db
      .prepare('SELECT id, customer_id, name, nickname, email, role, avatar_url, phone, loyalty_points FROM users WHERE id = ?')
      .get(userId) as any;
    if (!user) {
      (req as any).session.destroy(() => {
        res.clearCookie('wag_sid', { path: '/' });
        res.status(401).json({ success: false, message: 'Account not found. Please log in again.' });
      });
      return;
    }
    res.json({ success: true, user });
  });

  app.patch('/api/user/profile', (req, res) => {
    const userId = (req as any).session?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Session expired.' });
    const { nickname, avatar_url } = req.body;
    db.prepare('UPDATE users SET nickname = ?, avatar_url = ? WHERE id = ?').run(nickname, avatar_url, userId);
    const user = db
      .prepare('SELECT id, customer_id, name, nickname, email, role, avatar_url, phone, loyalty_points FROM users WHERE id = ?')
      .get(userId);
    res.json({ success: true, user });
  });

  app.post('/api/user/avatar', upload.single('avatar'), (req, res) => {
    const userId = (req as any).session?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const user = db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(userId) as any;
    if (user?.avatar_url?.startsWith('/uploads/')) {
      const oldPath = path.join(UPLOAD_DIR, path.basename(user.avatar_url));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    const avatarUrl = `/uploads/${req.file.filename}`;
    db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, userId);
    res.json({ success: true, avatar_url: avatarUrl });
  });

  app.post(
    '/api/upload',
    (req, res, next) => {
      const userId = (req as any).session?.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      next();
    },
    (req, res, next) => {
      upload.single('avatar')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE')
            return res.status(400).json({ success: false, message: 'File too large. Maximum 2MB.' });
          return res.status(400).json({ success: false, message: err.message });
        } else if (err) {
          return res.status(400).json({ success: false, message: err.message });
        }
        next();
      });
    },
    (req, res) => {
      const userId = (req as any).session?.userId;
      if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
      const currentUser = db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(userId) as any;
      if (currentUser?.avatar_url?.startsWith('/uploads/')) {
        const oldPath = path.join(UPLOAD_DIR, path.basename(currentUser.avatar_url));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      const fileUrl = `/uploads/${req.file.filename}`;
      db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(fileUrl, userId);
      res.json({ success: true, url: fileUrl });
    }
  );

  // ============ USER ACCOUNT DETAILS ============
  app.get('/api/user/account-details', (req, res) => {
    const userId = (req as any).session?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    try {
      const orders = db
        .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC')
        .all(userId) as any[];
      for (const order of orders) {
        order.items = db
          .prepare(
            'SELECT mi.name, oi.quantity, oi.price FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id WHERE oi.order_id = ?'
          )
          .all(order.id);
      }
      const reservations = db.prepare('SELECT * FROM reservations WHERE user_id = ? ORDER BY created_at DESC').all(userId);
      const notifications = db.prepare('SELECT * FROM user_notifications WHERE user_id = ? ORDER BY created_at DESC').all(userId);
      const paymentMethods = db
        .prepare('SELECT * FROM user_payment_methods WHERE user_id = ? ORDER BY is_default DESC, created_at DESC')
        .all(userId);
      res.json({ success: true, orders, reservations, notifications, paymentMethods });
    } catch (err: any) {
      console.error('Account details error:', err);
      res.status(500).json({ success: false, message: 'Failed to load account details.' });
    }
  });

  app.get('/api/user/orders', (req, res) => {
    const userId = (req as any).session?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const orders = db
      .prepare(
        `SELECT o.*, (
          SELECT json_group_array(json_object('name', mi.name, 'quantity', oi.quantity, 'price', oi.price))
          FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id WHERE oi.order_id = o.id
        ) as items FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC`
      )
      .all(userId) as any[];
    res.json(orders.map((o) => ({ ...o, items: JSON.parse(o.items || '[]') })));
  });

  app.get('/api/user/orders/:id', (req, res) => {
    const userId = (req as any).session?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any;
    if (!order) return res.status(404).json({ message: 'Order not found' });
    order.items = db
      .prepare(
        'SELECT mi.name, oi.quantity, oi.price FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id WHERE oi.order_id = ?'
      )
      .all(order.id);
    res.json(order);
  });

  app.get('/api/user/reservations', (req, res) => {
    const userId = (req as any).session?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const reservations = db
      .prepare('SELECT * FROM reservations WHERE user_id = ? ORDER BY date DESC, time DESC')
      .all(userId);
    res.json(reservations);
  });

  app.get('/api/user/notifications', (req, res) => {
    const userId = (req as any).session?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const count = db.prepare('SELECT COUNT(*) as count FROM user_notifications WHERE user_id = ?').get(userId) as any;
    if (count.count === 0) {
      db.prepare('INSERT INTO user_notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)').run(
        userId,
        'Welcome to WAG!',
        'Thank you for joining our luxury dining family.',
        'info'
      );
    }
    const notifications = db
      .prepare('SELECT * FROM user_notifications WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId);
    res.json(notifications);
  });

  app.patch('/api/user/notifications/read-all', (req, res) => {
    const userId = (req as any).session?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    db.prepare('UPDATE user_notifications SET is_read = 1 WHERE user_id = ?').run(userId);
    res.json({ success: true });
  });

  app.patch('/api/user/notifications/:id/read', (req, res) => {
    const userId = (req as any).session?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    db.prepare('UPDATE user_notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ success: true });
  });

  // ============ PAYMENT METHODS ============
  async function getOrCreateStripeCustomer(userId: number, email: string, name: string): Promise<string> {
    const user = db.prepare('SELECT stripe_customer_id FROM users WHERE id = ?').get(userId) as any;
    if (user?.stripe_customer_id) return user.stripe_customer_id;
    const stripe = getStripe();
    if (!stripe) throw new Error('Stripe not configured');
    const customer = await stripe.customers.create({ email, name, metadata: { userId: String(userId) } });
    db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customer.id, userId);
    return customer.id;
  }

  app.post('/api/user/portal-session', async (req, res) => {
    const userId = (req as any).session?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Session expired. Please log in.' });
    try {
      const user = db.prepare('SELECT email, name FROM users WHERE id = ?').get(userId) as any;
      if (!user) return res.status(401).json({ success: false, message: 'Account not found.' });
      const stripeCustomerId = await getOrCreateStripeCustomer(userId, user.email, user.name);
      const stripe = getStripe();
      if (!stripe) return res.status(500).json({ success: false, message: 'Payment gateway not configured.' });
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${req.headers.origin}/account`,
      });
      res.json({ success: true, url: portalSession.url });
    } catch (err: any) {
      console.error('Stripe Portal Error:', err);
      res.status(500).json({ success: false, message: 'Payment gateway error.' });
    }
  });

  app.get('/api/user/payment-methods', (req, res) => {
    const userId = (req as any).session?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const methods = db
      .prepare('SELECT * FROM user_payment_methods WHERE user_id = ? ORDER BY is_default DESC, created_at DESC')
      .all(userId);
    res.json(methods);
  });

  app.post('/api/user/payment-methods', (req, res) => {
    const userId = (req as any).session?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { type, provider, last4, expiry, is_default } = req.body;
    if (is_default) db.prepare('UPDATE user_payment_methods SET is_default = 0 WHERE user_id = ?').run(userId);
    const result = db
      .prepare('INSERT INTO user_payment_methods (user_id, type, provider, last4, expiry, is_default) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, type, provider, last4, expiry, is_default ? 1 : 0);
    res.json({ success: true, id: result.lastInsertRowid });
  });

  app.delete('/api/user/payment-methods/:id', (req, res) => {
    const userId = (req as any).session?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    db.prepare('DELETE FROM user_payment_methods WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ success: true });
  });

  app.patch('/api/user/payment-methods/:id/default', (req, res) => {
    const userId = (req as any).session?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const method = db.prepare('SELECT id FROM user_payment_methods WHERE id = ? AND user_id = ?').get(req.params.id, userId);
    if (!method) return res.status(404).json({ message: 'Payment method not found' });
    db.transaction(() => {
      db.prepare('UPDATE user_payment_methods SET is_default = 0 WHERE user_id = ?').run(userId);
      db.prepare('UPDATE user_payment_methods SET is_default = 1 WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    })();
    res.json({ success: true });
  });

  // ============ ORDERS ============
  app.post('/api/orders', async (req, res) => {
    const userId = (req as any).session?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Please log in to place an order.' });
    const { items, subtotal = 0, tax = 0, service_charge = 0, total_amount, payment_method, shipping_info } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in order.' });
    }
    try {
      const pointsEarned = Math.floor(total_amount || 0);
      const orderNumber = `WAG-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const info = db
        .prepare(
          `INSERT INTO orders (order_number, user_id, subtotal, tax, service_charge, total_amount, points_earned, payment_method, payment_status, status, shipping_name, shipping_email, shipping_address, shipping_phone, order_notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, ?, ?, ?)`
        )
        .run(
          orderNumber, userId, subtotal, tax, service_charge, total_amount, pointsEarned, payment_method,
          shipping_info?.name || '', shipping_info?.email || '', shipping_info?.address || '',
          shipping_info?.phone || '', shipping_info?.notes || ''
        );
      const orderId = info.lastInsertRowid as number;
      const insertItem = db.prepare('INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)');
      for (const item of items) {
        insertItem.run(orderId, item.id, item.quantity, item.price);
      }
      db.prepare('UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?').run(pointsEarned, userId);
      db.prepare('INSERT INTO user_notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)').run(
        userId, 'Order Placed', `Your order ${orderNumber} has been received.`, 'success'
      );

      const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as any;
      if (adminUser) {
        db.prepare('INSERT INTO user_notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)').run(
          adminUser.id,
          '🛒 New Order',
          `Order #${orderNumber} placed by ${shipping_info?.name || 'Guest'}`,
          'order'
        );
      }
      sendMailAsync(
        process.env.ADMIN_EMAIL || process.env.MAIL_USERNAME || '',
        `🛒 New Order: ${orderNumber}`,
        `<h3>New Order #${orderNumber}</h3><p>Total: $${total_amount}</p><p><a href="${process.env.VITE_API_URL || 'https://your-domain.com'}/admin">View in Admin</a></p>`
      ).catch(console.error);

      if (payment_method === 'card') {
        const stripe = getStripe();
        if (!stripe) return res.status(500).json({ success: false, message: 'Payment gateway not configured.' });
        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item: any) => {
          const menuItem = db.prepare('SELECT name FROM menu_items WHERE id = ?').get(item.id) as any;
          return {
            price_data: {
              currency: 'usd',
              product_data: { name: menuItem?.name || 'Menu Item' },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: item.quantity,
          };
        });
        if (tax > 0) {
          lineItems.push({ price_data: { currency: 'usd', product_data: { name: 'Tax (13%)' }, unit_amount: Math.round(tax * 100) }, quantity: 1 });
        }
        if (service_charge > 0) {
          lineItems.push({ price_data: { currency: 'usd', product_data: { name: 'Service Charge (10%)' }, unit_amount: Math.round(service_charge * 100) }, quantity: 1 });
        }
        const checkoutSession = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: lineItems,
          mode: 'payment',
          metadata: { orderNumber },
          success_url: `${req.headers.origin}/order-success/${orderId}?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${req.headers.origin}/checkout`,
          customer_email: shipping_info?.email || '',
        });
        db.prepare('UPDATE orders SET stripe_session_id = ? WHERE id = ?').run(checkoutSession.id, orderId);
        return res.json({ success: true, orderId, checkoutUrl: checkoutSession.url });
      }
      res.json({ success: true, orderId });
    } catch (err: any) {
      console.error('Order creation error:', err);
      res.status(500).json({ success: false, message: 'Failed to process order: ' + err.message });
    }
  });

  // ============ MENU ROUTES ============
  app.get('/api/menu', (_req, res) => {
    const menu = db.prepare('SELECT * FROM menu_items WHERE is_available = 1').all();
    res.json(menu);
  });

  app.get('/api/menu/all', (req, res) => {
    if ((req as any).session?.userRole !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    const menu = db.prepare('SELECT * FROM menu_items').all();
    res.json(menu);
  });

  app.get('/api/menu/:id', (req, res) => {
    const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  });

  app.post('/api/menu', (req, res) => {
    if ((req as any).session?.userRole !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    const { name, description, price, category, is_veg, is_spicy, image_url } = req.body;
    if (!name || !price || !category) return res.status(400).json({ message: 'Name, price, and category are required.' });
    db.prepare('INSERT INTO menu_items (name, description, price, category, is_veg, is_spicy, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(name, description, Number(price), category, is_veg ? 1 : 0, is_spicy ? 1 : 0, image_url);
    res.json({ success: true });
  });

  app.patch('/api/menu/:id', (req, res) => {
    if ((req as any).session?.userRole !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    const { name, description, price, category, is_veg, is_spicy, image_url, is_available } = req.body;
    db.prepare(
      'UPDATE menu_items SET name = ?, description = ?, price = ?, category = ?, is_veg = ?, is_spicy = ?, image_url = ?, is_available = ? WHERE id = ?'
    ).run(name, description, Number(price), category, is_veg ? 1 : 0, is_spicy ? 1 : 0, image_url, is_available !== undefined ? (is_available ? 1 : 0) : 1, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/menu/:id', (req, res) => {
    if ((req as any).session?.userRole !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    db.prepare('DELETE FROM menu_items WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // ============ RESERVATIONS ============
  app.post('/api/reservations', async (req, res) => {
    const { name, email, phone, date, time, guests, notes } = req.body;
    if (!name || !email || !phone || !date || !time || !guests) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    const userId = (req as any).session?.userId || null;
    try {
      const result = db.prepare(
        'INSERT INTO reservations (user_id, name, email, phone, date, time, guests, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(userId, name, email, phone, date, time, guests, notes || '');
      const reservationId = result.lastInsertRowid;

      await sendMailAsync(
        email,
        'Reservation Confirmed - WAG Restaurant',
        `<h2>Reservation Confirmed!</h2><p>Dear ${name}, your reservation on <strong>${date}</strong> at <strong>${time}</strong> for <strong>${guests} guests</strong> is confirmed.</p>`
      ).catch(console.error);

      const adminEmail = process.env.ADMIN_EMAIL || process.env.MAIL_USERNAME || '';
      if (adminEmail && adminEmail !== email) {
        await sendMailAsync(
          adminEmail,
          `🆕 New Reservation: ${name}`,
          `<h3>New Reservation</h3><p>Name: ${name}<br>Email: ${email}<br>Phone: ${phone}<br>Date: ${date}<br>Time: ${time}<br>Guests: ${guests}<br>Notes: ${notes || 'None'}</p><p><a href="${process.env.VITE_API_URL || 'https://your-domain.com'}/admin">Go to Admin Dashboard</a></p>`
        ).catch(console.error);
      }

      const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as any;
      if (adminUser) {
        db.prepare('INSERT INTO user_notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)').run(
          adminUser.id,
          '📅 New Reservation',
          `${name} booked a table for ${guests} on ${date} at ${time}`,
          'reservation'
        );
      }

      res.json({ success: true, message: 'Reservation confirmed!', id: reservationId });
    } catch (err: any) {
      console.error('Reservation Error:', err);
      res.status(500).json({ success: false, message: 'Failed to process reservation.' });
    }
  });

  app.get('/api/reservations', (req, res) => {
    if ((req as any).session?.userRole !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    const reservations = db.prepare('SELECT * FROM reservations ORDER BY created_at DESC').all();
    res.json(reservations);
  });

  app.patch('/api/reservations/:id/read', (req, res) => {
    if ((req as any).session?.userRole !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    db.prepare('UPDATE reservations SET is_read = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.patch('/api/reservations/:id/status', (req, res) => {
    if ((req as any).session?.userRole !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    const { status } = req.body;
    db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ success: true });
  });

  // ============ CONTACT FORM ============
  app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
    }
    try {
      db.prepare(
        `INSERT INTO messages (name, email, subject, message, is_read, created_at) VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`
      ).run(name, email, subject || 'No subject', message);

      const adminEmail = process.env.ADMIN_EMAIL || process.env.MAIL_USERNAME || '';
      if (adminEmail) {
        await sendMailAsync(
          adminEmail,
          `[Contact] ${subject || 'New Message'} - from ${name}`,
          `<h2>Contact Form</h2><p><strong>From:</strong> ${name} (${email})</p><p><strong>Subject:</strong> ${subject}</p><p><strong>Message:</strong></p><p>${message}</p>`
        ).catch(console.error);
      }

      const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as any;
      if (adminUser) {
        db.prepare('INSERT INTO user_notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)').run(
          adminUser.id,
          '💬 New Contact Message',
          `${name} sent a message: "${message.substring(0, 50)}..."`,
          'message'
        );
      }

      res.json({ success: true, message: 'Message sent successfully!' });
    } catch (err: any) {
      console.error('Contact error:', err);
      res.status(500).json({ success: false, message: 'Failed to send message.' });
    }
  });

  app.post('/api/send-message', (req, res, next) => {
    req.url = '/api/contact';
    next('route');
  });

  app.get('/api/messages', (req, res) => {
    if ((req as any).session?.userRole !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    const messages = db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all();
    res.json(messages);
  });

  app.patch('/api/messages/:id/read', (req, res) => {
    if ((req as any).session?.userRole !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
    db.prepare('UPDATE messages SET is_read = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // ============ AI CONCIERGE ============
  app.post('/api/concierge', async (req, res) => {
    const { messages, userName = 'Guest' } = req.body;
    const groqApiKey = process.env.GROQ_API_KEY;
    const lastUserMessage = Array.isArray(messages)
      ? messages.filter((m: any) => m.role === 'user').pop()?.content || ''
      : '';
    if (!groqApiKey) {
      const msg = lastUserMessage.toLowerCase();
      let reply = "Welcome to WAG! How can I assist you today?";
      if (msg.includes('menu')) reply = "Our menu features Wagyu steak, truffle pasta, saffron risotto, and more.";
      else if (msg.includes('reserv')) reply = "You can book a table on our Reservations page.";
      else if (msg.includes('hour')) reply = "We're open daily 5 PM – 11 PM.";
      return res.json({ reply });
    }
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are a helpful AI concierge for WAG Luxury Dining restaurant in Kathmandu, Nepal. Help guests with menu questions, reservations, hours (5 PM–11 PM daily), and general inquiries. Be warm and professional. Keep answers concise.`,
            },
            { role: 'user', content: lastUserMessage },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "I'm having trouble right now. Please call +977 1 4235678.";
      res.json({ reply });
    } catch (err: any) {
      console.error('Groq error:', err);
      res.json({ reply: "I'm having technical difficulties. Please call us at +977 1 4235678." });
    }
  });

  app.get('/api/chat', (req, res) => {
    const userId = (req as any).session?.userId;
    if (!userId) return res.json([]);
    const history = db.prepare('SELECT role, content FROM chat_history WHERE user_id = ? ORDER BY created_at ASC LIMIT 100').all(userId);
    res.json(history);
  });

  app.post('/api/chat/history', (req, res) => {
    const userId = (req as any).session?.userId || null;
    const { role, content } = req.body;
    if (!role || !content) return res.status(400).json({ success: false });
    db.prepare('INSERT INTO chat_history (user_id, role, content) VALUES (?, ?, ?)').run(userId, role, content);
    res.json({ success: true });
  });

  app.post('/api/newsletter', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });
    try {
      db.prepare('INSERT INTO newsletter (email) VALUES (?)').run(email);
      res.json({ success: true, message: 'Subscribed successfully!' });
    } catch (err: any) {
      if (err.message?.includes('UNIQUE')) {
        return res.status(400).json({ success: false, message: 'Already subscribed.' });
      }
      res.status(500).json({ success: false, message: 'Failed to subscribe.' });
    }
  });

  // ============ ADMIN ROUTES ============
  function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    if ((req as any).session?.userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    next();
  }

  app.post('/api/admin/seed-menu', requireAdmin, (req, res) => {
    const items = [
      ['Chicken Momo', 'Steamed dumplings with spicy sauce', 180, 'Appetizer', 0, 1, 'https://picsum.photos/seed/momo/400/300'],
      ['Buff Momo', 'Juicy buff dumplings with achar', 200, 'Appetizer', 0, 1, 'https://picsum.photos/seed/momo2/400/300'],
      ['Veg Momo', 'Soft vegetable dumplings', 150, 'Appetizer', 1, 0, 'https://picsum.photos/seed/vegmomo/400/300'],
      ['Chatpate', 'Spicy puffed rice snack', 100, 'Appetizer', 1, 1, 'https://picsum.photos/seed/chatpate/400/300'],
      ['Dal Bhat Set', 'Rice, dal, vegetables and pickle', 350, 'Main Course', 1, 0, 'https://picsum.photos/seed/dalbhat/400/300'],
      ['Chicken Chowmein', 'Fried noodles with chicken', 220, 'Main Course', 0, 0, 'https://picsum.photos/seed/chowmein/400/300'],
      ['Thakali Khana Set', 'Traditional Nepali thali', 450, 'Main Course', 0, 0, 'https://picsum.photos/seed/thakali/400/300'],
      ['Buff Sukuti', 'Dry spicy buffalo meat', 480, 'Main Course', 0, 1, 'https://picsum.photos/seed/sukuti/400/300'],
      ['Juju Dhau', 'Sweet creamy yogurt', 150, 'Dessert', 1, 0, 'https://picsum.photos/seed/juju/400/300'],
      ['Kheer', 'Rice pudding with milk', 120, 'Dessert', 1, 0, 'https://picsum.photos/seed/kheer/400/300'],
      ['Sel Roti', 'Sweet rice bread', 180, 'Dessert', 1, 0, 'https://picsum.photos/seed/selroti/400/300'],
      ['Ice Cream', 'Cold sweet dessert', 100, 'Dessert', 1, 0, 'https://picsum.photos/seed/icecream/400/300'],
      ['Masala Tea', 'Hot milk tea with spices', 50, 'Drinks', 1, 0, 'https://picsum.photos/seed/tea/400/300'],
      ['Lassi', 'Sweet yogurt drink', 120, 'Drinks', 1, 0, 'https://picsum.photos/seed/lassi/400/300'],
      ['Lemon Soda', 'Fresh lemon with soda', 100, 'Drinks', 1, 0, 'https://picsum.photos/seed/soda/400/300'],
      ['Cold Drink', 'Chilled soft drink', 90, 'Drinks', 1, 0, 'https://picsum.photos/seed/coke/400/300']
    ];
    try {
      db.prepare('DELETE FROM menu_items').run();
      const insert = db.prepare(`INSERT INTO menu_items (name, description, price, category, is_veg, is_spicy, image_url, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`);
      for (const item of items) {
        insert.run(...item);
      }
      res.json({ success: true, message: 'Menu seeded with 16 Nepali items' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/stats', requireAdmin, (req, res) => {
    try {
      const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0;
      const orderCount = (db.prepare('SELECT COUNT(*) as count FROM orders').get() as any)?.count || 0;
      const reservationCount = (db.prepare('SELECT COUNT(*) as count FROM reservations').get() as any)?.count || 0;
      const menuCount = (db.prepare('SELECT COUNT(*) as count FROM menu_items').get() as any)?.count || 0;
      const revenue = (db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status = 'paid'`).get() as any)?.total || 0;
      const unreadMessages = (db.prepare('SELECT COUNT(*) as count FROM messages WHERE is_read = 0').get() as any)?.count || 0;
      const unreadReservations = (db.prepare('SELECT COUNT(*) as count FROM reservations WHERE is_read = 0').get() as any)?.count || 0;
      // ✅ FIXED: Use 'menuItems' instead of 'menu' for frontend compatibility
      res.json({ users: userCount, orders: orderCount, reservations: reservationCount, menuItems: menuCount, revenue, unreadMessages, unreadReservations });
    } catch (err: any) {
      console.error('Stats error:', err);
      res.status(500).json({ message: 'Failed to fetch stats.' });
    }
  });

  app.get('/api/admin/orders', requireAdmin, (_req, res) => {
    try {
      const orders = db
        .prepare(
          `SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
           FROM orders o JOIN users u ON o.user_id = u.id
           ORDER BY o.created_at DESC`
        )
        .all() as any[];
      for (const order of orders) {
        order.items = db
          .prepare(
            `SELECT mi.name, oi.quantity, oi.price
             FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id
             WHERE oi.order_id = ?`
          )
          .all(order.id);
      }
      res.json(orders);
    } catch (err) {
      console.error('Admin orders error:', err);
      res.status(500).json({ message: 'Failed to fetch orders.' });
    }
  });

  app.patch('/api/admin/orders/:id/status', requireAdmin, (req, res) => {
    const { status, payment_status } = req.body;
    if (status) db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    if (payment_status) db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').run(payment_status, req.params.id);
    res.json({ success: true });
  });

  app.get('/api/admin/users', requireAdmin, (_req, res) => {
    try {
      const users = db
        .prepare(`SELECT id, customer_id, name, nickname, email, role, phone, loyalty_points, created_at FROM users ORDER BY created_at DESC`)
        .all() as any[];
      for (const user of users) {
        const orderStats = db
          .prepare(`SELECT COUNT(*) as order_count, COALESCE(SUM(total_amount), 0) as total_spent FROM orders WHERE user_id = ? AND payment_status = 'paid'`)
          .get(user.id) as any;
        user.order_count = orderStats?.order_count || 0;
        user.total_spent = orderStats?.total_spent || 0;
      }
      res.json(users);
    } catch (err) {
      console.error('Admin users error:', err);
      res.status(500).json({ message: 'Failed to fetch users.' });
    }
  });

  app.patch('/api/admin/users/:id/role', requireAdmin, (req, res) => {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role.' });
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
    res.json({ success: true });
  });

  app.get('/api/admin/newsletter', requireAdmin, (_req, res) => {
    const subscribers = db.prepare('SELECT * FROM newsletter ORDER BY created_at DESC').all();
    res.json(subscribers);
  });

  app.get('/api/admin/chat-logs', requireAdmin, (_req, res) => {
    const logs = db.prepare('SELECT * FROM chat_history ORDER BY created_at DESC LIMIT 200').all();
    res.json(logs);
  });

  app.post('/api/admin/seed-sample-data', requireAdmin, (_req, res) => {
    try {
      const user = db.prepare('SELECT id FROM users LIMIT 1').get() as any;
      if (user) {
        for (let i = 0; i < 3; i++) {
          const orderNumber = `WAG-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
          const total = 50 + i * 20;
          const orderId = db.prepare(`INSERT INTO orders (order_number, user_id, subtotal, tax, service_charge, total_amount, status, payment_status) VALUES (?, ?, ?, ?, ?, ?, 'completed', 'paid')`).run(
            orderNumber, user.id, total - 10, total * 0.13, total * 0.1, total
          ).lastInsertRowid;
          const menuItems = db.prepare('SELECT id, price FROM menu_items LIMIT 2').all() as any[];
          for (let j = 0; j < menuItems.length; j++) {
            db.prepare('INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)').run(orderId, menuItems[j].id, 1, menuItems[j].price);
          }
        }
      }
      res.json({ success: true, message: 'Sample data seeded.' });
    } catch (err: any) {
      console.error('Seed error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ============ SETTINGS ============
  app.get('/api/settings', (_req, res) => {
    try {
      const rows = db.prepare('SELECT key, value FROM settings').all() as any[];
      const settings: Record<string, string> = {};
      rows.forEach((row) => { settings[row.key] = row.value; });
      res.json(settings);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch settings.' });
    }
  });

  app.post('/api/settings', requireAdmin, (req, res) => {
    const settings = req.body;
    try {
      const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      const insertMany = db.transaction((entries: [string, string][]) => {
        for (const [key, value] of entries) {
          if (key && value !== undefined) upsert.run(key, String(value));
        }
      });
      insertMany(Object.entries(settings) as [string, string][]);
      res.json({ success: true, message: 'Settings saved.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get('/api/settings/map-url', (_req, res) => {
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('map_url') as any;
    res.json({ success: true, map_url: setting?.value || '' });
  });

  app.post('/api/settings/map-url', requireAdmin, (req, res) => {
    const { map_url } = req.body;
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('map_url', map_url);
    res.json({ success: true });
  });

  // ============ PRODUCTION STATIC FILES ============
  if (IS_PRODUCTION) {
    const distPath = path.join(process.cwd(), 'dist');
    console.log(`📂 Serving static files from: ${distPath}`);
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath, { maxAge: '1d' }));
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
          return res.status(404).json({ message: 'Not found' });
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn(`⚠️  dist/ folder not found at ${distPath}. Run 'npm run build' first.`);
    }
  } else {
    console.log('🔧 Starting Vite development server...');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health`);
    console.log(`🍽️  Menu: http://localhost:${PORT}/api/menu`);
    console.log('========================================');
  });
}

startServer().catch((err) => {
  console.error('💥 Failed to start server:', err);
  process.exit(1);
});