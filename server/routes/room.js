const express = require('express');
const mongoose = require('mongoose');
const Room = require('../models/Room');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Create room
router.post('/create', protect, async (req, res) => {
  try {
    const { quizId, settings } = req.body;

    let quizRef = null;
    if (quizId != null && quizId !== '' && mongoose.Types.ObjectId.isValid(String(quizId))) {
      quizRef = String(quizId);
    }

    let code;
    let isUnique = false;
    while (!isUnique) {
      code = Room.generateCode();
      const existing = await Room.findOne({ code });
      if (!existing) isUnique = true;
    }

    const room = await Room.create({
      code,
      host: req.user._id,
      quiz: quizRef,
      settings: settings || {},
      players: [{
        userId: req.user._id,
        username: req.user.username,
        avatar: req.user.avatar,
        socketId: '',
        isReady: true,
      }],
    });

    await room.populate('quiz');

    res.status(201).json({ success: true, room, code });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get room by code
router.get('/:code', async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() })
      .populate('quiz')
      .populate('host', 'username avatar');

    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    res.json({ success: true, room });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
