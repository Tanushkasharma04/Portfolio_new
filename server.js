'use strict';

const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const express = require('express');

const projects = require('./projects.json');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const ADMIN_KEY = process.env.ADMIN_KEY || '';

// Render and most hosts sit behind a proxy; this makes req.ip the real visitor IP.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- tiny in-memory rate limiter (5 messages per 15 minutes per IP) ---------- */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;
const hits = new Map();

function rateLimit(req, res, next) {
  const now = Date.now();
  const entry = hits.get(req.ip);
  if (!entry || entry.resetAt < now) {
    hits.set(req.ip, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }
  if (entry.count >= MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many messages. Please try again later.' });
  }
  entry.count += 1;
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of hits) {
    if (entry.resetAt < now) hits.delete(ip);
  }
}, WINDOW_MS).unref();

/* ---------- saving messages to a JSON file ---------- */
let writeQueue = Promise.resolve();

function saveMessage(message) {
  const task = async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    let list = [];
    try {
      list = JSON.parse(await fs.readFile(MESSAGES_FILE, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    list.push(message);
    await fs.writeFile(MESSAGES_FILE, JSON.stringify(list, null, 2));
  };
  // Run one write at a time so two visitors can't overwrite each other.
  const run = writeQueue.then(task);
  writeQueue = run.catch(() => {});
  return run;
}

/* ---------- API routes ---------- */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
});

app.get('/api/projects', (req, res) => {
  res.json(projects);
});

app.get('/api/projects/:id', (req, res) => {
  const project = projects.find((p) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  res.json(project);
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post('/api/contact', rateLimit, async (req, res, next) => {
  try {
    const body = req.body || {};

    // Hidden "honeypot" field: real people leave it empty, bots fill it in.
    if (body.website) return res.status(201).json({ message: 'Thanks! Your message was sent.' });

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!name || name.length > 100) {
      return res.status(400).json({ error: 'Please enter your name (up to 100 characters).' });
    }
    if (!EMAIL_PATTERN.test(email) || email.length > 200) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (message.length < 5 || message.length > 1000) {
      return res.status(400).json({ error: 'Your message should be 5 to 1000 characters long.' });
    }

    await saveMessage({
      id: crypto.randomUUID(),
      name,
      email,
      message,
      receivedAt: new Date().toISOString(),
    });

    res.status(201).json({ message: 'Thanks! Your message was sent.' });
  } catch (err) {
    next(err);
  }
});

// Read saved messages. Only works if you set an ADMIN_KEY environment variable.
app.get('/api/messages', async (req, res, next) => {
  try {
    if (!ADMIN_KEY) return res.status(404).json({ error: 'Not found.' });

    const provided = Buffer.from(String(req.get('x-admin-key') || ''));
    const expected = Buffer.from(ADMIN_KEY);
    const allowed = provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
    if (!allowed) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      res.json(JSON.parse(await fs.readFile(MESSAGES_FILE, 'utf8')));
    } catch (err) {
      if (err.code === 'ENOENT') return res.json([]);
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

/* ---------- error handler ---------- */
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err.status === 400) {
    return res.status(400).json({ error: 'Invalid request.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request too large.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Portfolio running on port ${PORT}`);
});
