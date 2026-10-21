const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: String,
  avatar: String,
  score: { type: Number, default: 0 },
  answers: [{
    questionIndex: Number,
    answer: Number,
    isCorrect: Boolean,
    timeSpent: Number,
    points: Number,
  }],
  isReady: { type: Boolean, default: false },
  socketId: String,
});

const roomSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    length: 6,
  },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
  players: [playerSchema],
  status: {
    type: String,
    enum: ['waiting', 'starting', 'playing', 'finished'],
    default: 'waiting',
  },
  currentQuestion: { type: Number, default: 0 },
  maxPlayers: { type: Number, default: 10 },
  settings: {
    showLeaderboard: { type: Boolean, default: true },
    randomizeQuestions: { type: Boolean, default: false },
    allowLateJoin: { type: Boolean, default: false },
  },
  startedAt: Date,
  finishedAt: Date,
  createdAt: { type: Date, default: Date.now },
});

// Generate room code
roomSchema.statics.generateCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

module.exports = mongoose.model('Room', roomSchema);
