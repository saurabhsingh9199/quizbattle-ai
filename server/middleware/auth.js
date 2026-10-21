const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const toObjectIdLike = (value) => {
  if (!value) return crypto.randomBytes(12).toString('hex');
  const normalized = String(value).trim().toLowerCase();
  if (/^[a-f0-9]{24}$/.test(normalized)) return normalized;
  return crypto.createHash('md5').update(normalized).digest('hex').slice(0, 24);
};

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    // Guest user
    if (decoded.isGuest) {
      const guestObjectId = toObjectIdLike(decoded.id || decoded.username);
      req.user = {
        _id: guestObjectId,
        id: guestObjectId,
        username: decoded.username,
        avatar: decoded.avatar,
        isGuest: true,
      };
      return next();
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

exports.adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};
