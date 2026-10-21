const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

const toObjectIdLike = (value) => {
  if (!value) return crypto.randomBytes(12).toString('hex');
  const normalized = String(value).trim().toLowerCase();
  if (/^[a-f0-9]{24}$/.test(normalized)) return normalized;
  return crypto.createHash('md5').update(normalized).digest('hex').slice(0, 24);
};

const signToken = (user) => {
  return jwt.sign({ id: user._id, username: user.username, avatar: user.avatar, role: user.role }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '7d',
  });
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already in use' : 'Username already taken',
      });
    }

    const user = await User.create({ username, email, password });
    const token = signToken(user);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        stats: user.stats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        stats: user.stats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});


// Global leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find({ role: 'player' })
      .select('username avatar stats xp winStreak bestStreak bestScore')
      .sort({ xp: -1, 'stats.gamesWon': -1, 'stats.totalScore': -1 })
      .limit(50)
      .lean();
    res.json({ success: true, leaderboard: users.map((u, i) => ({
      rank: i + 1, username: u.username, avatar: u.avatar,
      xp: u.xp || 0, level: Math.floor((u.xp || 0) / 500) + 1,
      wins: u.stats?.gamesWon || 0, gamesPlayed: u.stats?.gamesPlayed || 0,
      score: u.stats?.totalScore || 0, winStreak: u.winStreak || 0,
      bestScore: u.bestScore || 0,
    })) });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// Guest login
router.post('/guest', async (req, res) => {
  try {
    const { username } = req.body;
    const avatars = ['🦊', '🐺', '🦁', '🐯', '🐻', '🐼', '🦄', '🐉', '🦅', '🦋'];
    const avatar = avatars[Math.floor(Math.random() * avatars.length)];
    const guestId = toObjectIdLike(`guest_${Date.now()}_${Math.random()}`);

    const guestUser = {
      id: guestId,
      username: username || `Player${Math.floor(Math.random() * 9999)}`,
      email: null,
      avatar,
      isGuest: true,
      stats: { gamesPlayed: 0, gamesWon: 0, totalScore: 0 },
    };

    const token = jwt.sign(
      { id: guestUser.id, isGuest: true, username: guestUser.username, avatar: guestUser.avatar },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.json({ success: true, token, user: guestUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin register
router.post('/admin/register', async (req, res) => {
  try {
    const { username, email, password, adminKey } = req.body;
    if (process.env.ADMIN_SIGNUP_KEY && adminKey !== process.env.ADMIN_SIGNUP_KEY) {
      return res.status(403).json({ success: false, message: 'Invalid admin signup key' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already in use' : 'Username already taken',
      });
    }

    const user = await User.create({ username, email, password, role: 'admin' });
    const token = signToken(user);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        stats: user.stats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || user.role !== 'admin' || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    const token = signToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        stats: user.stats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
