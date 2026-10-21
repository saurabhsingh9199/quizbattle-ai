const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const crypto = require('crypto');
const Room = require('../models/Room');
const Quiz = require('../models/Quiz');
const User = require('../models/User');

// In-memory game state for active rooms
const activeGames = new Map();
const toObjectIdLike = (value) => {
  if (!value) return crypto.randomBytes(12).toString('hex');
  const normalized = String(value).trim().toLowerCase();
  if (/^[a-f0-9]{24}$/.test(normalized)) return normalized;
  return crypto.createHash('md5').update(normalized).digest('hex').slice(0, 24);
};

const setupSocketHandlers = (io) => {
  // Auth middleware for sockets
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      socket.user = { id: `anon_${Date.now()}`, username: 'Anonymous', avatar: '👤', isAnon: true };
      return next();
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      if (decoded.isGuest) {
        socket.user = { ...decoded, id: toObjectIdLike(decoded.id || decoded.username) };
        return next();
      }

      if (decoded.username && decoded.avatar) {
        socket.user = decoded;
        return next();
      }

      const dbUser = await User.findById(decoded.id).select('username avatar role');
      socket.user = dbUser
        ? { id: dbUser._id.toString(), username: dbUser.username, avatar: dbUser.avatar, role: dbUser.role }
        : decoded;
      next();
    } catch (err) {
      socket.user = { id: `anon_${Date.now()}`, username: 'Guest', avatar: '👤' };
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.user?.username || socket.id}`);

    // ─── JOIN ROOM ───────────────────────────────────────────────────────────
    socket.on('join_room', async ({ roomCode, username, avatar }) => {
      try {
        const room = await Room.findOne({ code: roomCode.toUpperCase() }).populate('quiz');
        if (!room) return socket.emit('error', { message: 'Room not found' });
        if (room.status === 'playing' && !room.settings?.allowLateJoin) return socket.emit('error', { message: 'Game already in progress' });
        if (room.players.length >= room.maxPlayers) return socket.emit('error', { message: 'Room is full' });

        // Add player if not already in room
        const existingPlayer = room.players.find(p =>
          p.userId?.toString() === socket.user.id || p.socketId === socket.id
        );

        const playerData = {
          userId: socket.user.id,
          username: username || socket.user.username || 'Player',
          avatar: avatar || socket.user.avatar || '🎮',
          score: 0,
          answers: [],
          isReady: false,
          socketId: socket.id,
        };

        if (!existingPlayer) {
          room.players.push(playerData);
          await room.save();
        } else {
          existingPlayer.socketId = socket.id;
          await room.save();
        }

        socket.join(roomCode);
        socket.roomCode = roomCode;

        // Send room state to the joining player
        socket.emit('room_joined', { room, player: playerData });

        // Notify all players
        io.to(roomCode).emit('player_joined', {
          players: room.players,
          newPlayer: playerData,
        });

      } catch (err) {
        console.error('join_room error:', err);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // ─── START GAME ──────────────────────────────────────────────────────────
    socket.on('start_game', async ({ roomCode, quizData }) => {
      try {
        const room = await Room.findOne({ code: roomCode }).populate('quiz');
        if (!room) return socket.emit('error', { message: 'Room not found' });
        if (room.host?.toString() !== String(socket.user.id)) {
          return socket.emit('error', { message: 'Only the room host can start the battle' });
        }
        if (room.status === 'playing') return socket.emit('error', { message: 'Game is already running' });

        const quiz = room.quiz || quizData;
        if (!quiz || !quiz.questions?.length) {
          return socket.emit('error', { message: 'No quiz selected' });
        }

        room.status = 'playing';
        room.currentQuestion = 0;
        room.startedAt = new Date();
        await room.save();

        // Store game state in memory
        activeGames.set(roomCode, {
          quiz,
          currentQuestion: 0,
          questionStartTime: null,
          answers: new Map(),
          timer: null,
          room: roomCode,
        });

        // Notify all players game is starting
        io.to(roomCode).emit('game_starting', { countdown: 3 });

        setTimeout(() => {
          sendQuestion(io, roomCode, quiz, 0);
        }, 3000);

      } catch (err) {
        console.error('start_game error:', err);
        socket.emit('error', { message: 'Failed to start game' });
      }
    });

    // ─── RE-SYNC GAME STATE ──────────────────────────────────────────────────
    socket.on('sync_game_state', async ({ roomCode }) => {
      try {
        const game = activeGames.get(roomCode);
        if (!game) return;
        const question = game.quiz.questions[game.currentQuestion];
        if (!question || !game.questionStartTime) return;

        const elapsedSeconds = Math.floor((Date.now() - game.questionStartTime) / 1000);
        const remainingTime = Math.max(0, question.timeLimit - elapsedSeconds);
        const room = await Room.findOne({ code: roomCode });

        socket.emit('question_start', {
          questionIndex: game.currentQuestion,
          totalQuestions: game.quiz.questions.length,
          question: question.question,
          options: question.options,
          timeLimit: remainingTime || question.timeLimit,
          points: question.points,
          category: question.category,
        });

        socket.emit('answer_update', {
          answeredCount: game.answers?.size || 0,
          totalPlayers: room?.players?.length || 0,
        });
      } catch (err) {
        console.error('sync_game_state error:', err);
      }
    });

    // ─── SUBMIT ANSWER ───────────────────────────────────────────────────────
    socket.on('submit_answer', async ({ roomCode, answer, timeSpent }) => {
      try {
        const game = activeGames.get(roomCode);
        if (!game) return;

        const { quiz, currentQuestion, questionStartTime, answers } = game;
        const question = quiz.questions[currentQuestion];

        // Don't allow duplicate answers
        if (answers.has(socket.user.id || socket.id)) return;

        const isCorrect = answer === question.correctAnswer;
        const timeBonus = Math.max(0, (question.timeLimit - timeSpent) / question.timeLimit);
        const points = isCorrect ? Math.round(question.points * (0.5 + 0.5 * timeBonus)) : 0;

        answers.set(socket.user.id || socket.id, {
          answer,
          isCorrect,
          points,
          timeSpent,
          username: socket.user.username,
          socketId: socket.id,
        });

        // Update player score in DB
        await Room.findOneAndUpdate(
          { code: roomCode, 'players.socketId': socket.id },
          {
            $inc: { 'players.$.score': points },
            $push: {
              'players.$.answers': {
                questionIndex: currentQuestion,
                answer,
                isCorrect,
                timeSpent,
                points,
              },
            },
          }
        );

        // Confirm to submitter
        socket.emit('answer_confirmed', { isCorrect, points, correctAnswer: question.correctAnswer });

        // Broadcast live answer count
        const room = await Room.findOne({ code: roomCode });
        io.to(roomCode).emit('answer_update', {
          answeredCount: answers.size,
          totalPlayers: room?.players?.length || 0,
        });

        // If all players answered, move to next question early
        if (room && answers.size >= room.players.length) {
          clearTimeout(game.timer);
          setTimeout(() => advanceQuestion(io, roomCode), 1500);
        }

      } catch (err) {
        console.error('submit_answer error:', err);
      }
    });

    // ─── DISCONNECT ──────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      try {
        const roomCode = socket.roomCode;
        if (!roomCode) return;

        await Room.findOneAndUpdate(
          { code: roomCode },
          { $pull: { players: { socketId: socket.id } } }
        );

        const room = await Room.findOne({ code: roomCode });
        if (room) {
          io.to(roomCode).emit('player_left', {
            players: room.players,
            username: socket.user?.username,
          });
        }
      } catch (err) {
        console.error('disconnect error:', err);
      }
    });

    // ─── CHAT ────────────────────────────────────────────────────────────────
    socket.on('send_chat', ({ roomCode, message }) => {
      io.to(roomCode).emit('chat_message', {
        username: socket.user?.username || 'Player',
        avatar: socket.user?.avatar || '🎮',
        message: message.slice(0, 200),
        timestamp: Date.now(),
      });
    });

    // ─── PLAY AGAIN ──────────────────────────────────────────────────────────
    socket.on('play_again', async ({ roomCode }) => {
      try {
        await Room.findOneAndUpdate(
          { code: roomCode },
          {
            status: 'waiting',
            currentQuestion: 0,
            'players.$[].score': 0,
            'players.$[].answers': [],
          }
        );
        activeGames.delete(roomCode);
        io.to(roomCode).emit('game_reset');
      } catch (err) {
        console.error('play_again error:', err);
      }
    });
  });

  // ─── HELPERS ────────────────────────────────────────────────────────────────
  const sendQuestion = (io, roomCode, quiz, questionIndex) => {
    const game = activeGames.get(roomCode);
    if (!game) return;

    const question = quiz.questions[questionIndex];
    if (!question) return;

    game.currentQuestion = questionIndex;
    game.questionStartTime = Date.now();
    game.answers = new Map();

    // Send question without correct answer
    io.to(roomCode).emit('question_start', {
      questionIndex,
      totalQuestions: quiz.questions.length,
      question: question.question,
      options: question.options,
      timeLimit: question.timeLimit,
      points: question.points,
      category: question.category,
    });

    // Auto-advance when time expires
    game.timer = setTimeout(() => {
      advanceQuestion(io, roomCode);
    }, question.timeLimit * 1000 + 500);
  };

  const advanceQuestion = async (io, roomCode) => {
    const game = activeGames.get(roomCode);
    if (!game) return;

    const { quiz, currentQuestion } = game;
    const question = quiz.questions[currentQuestion];

    // Get current leaderboard
    const room = await Room.findOne({ code: roomCode });
    const leaderboard = room?.players
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({ rank: i + 1, username: p.username, avatar: p.avatar, score: p.score }))
      || [];

    // Show answer reveal
    io.to(roomCode).emit('question_end', {
      correctAnswer: question.correctAnswer,
      leaderboard,
      questionIndex: currentQuestion,
    });

    const nextIndex = currentQuestion + 1;

    if (nextIndex < quiz.questions.length) {
      // Next question after delay
      setTimeout(() => {
        sendQuestion(io, roomCode, quiz, nextIndex);
      }, 4000);
    } else {
      // Game over
      setTimeout(async () => {
        if (room) {
          room.status = 'finished';
          room.finishedAt = new Date();
          await room.save();

          const maxScore = room.players.reduce((max, p) => Math.max(max, p.score || 0), 0);
          const statUpdates = [];

          for (const player of room.players) {
            if (!player.userId || !mongoose.Types.ObjectId.isValid(player.userId)) continue;
            const correctAnswers = (player.answers || []).filter((a) => a.isCorrect).length;
            const isWinner = (player.score || 0) === maxScore && room.players.length > 0;
            const xpEarned = 50 + correctAnswers * 10 + (isWinner ? 100 : 0);
            const currentUser = await User.findById(player.userId).select('winStreak bestStreak');
            const nextStreak = isWinner ? ((currentUser?.winStreak || 0) + 1) : 0;
            const bestStreak = Math.max(currentUser?.bestStreak || 0, nextStreak);

            statUpdates.push({
              updateOne: {
                filter: { _id: player.userId },
                update: {
                  $inc: {
                    'stats.gamesPlayed': 1,
                    'stats.gamesWon': isWinner ? 1 : 0,
                    'stats.totalScore': player.score || 0,
                    'stats.correctAnswers': correctAnswers,
                    xp: xpEarned,
                  },
                  $set: { winStreak: nextStreak, bestStreak },
                  $max: { bestScore: player.score || 0 },
                },
              },
            });
          }

          if (statUpdates.length > 0) {
            await User.bulkWrite(statUpdates);
          }
        }

        io.to(roomCode).emit('game_over', {
          leaderboard,
          winner: leaderboard[0] || null,
        });

        activeGames.delete(roomCode);
      }, 4000);
    }
  };
};

module.exports = { setupSocketHandlers };
