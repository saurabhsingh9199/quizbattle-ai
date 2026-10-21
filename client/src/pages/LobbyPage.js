import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useSounds } from '../utils/sounds';

const SAMPLE_QUESTIONS = [
  { question: "What is the capital of Australia?", options: ["Sydney","Melbourne","Canberra","Brisbane"], correctAnswer: 2, timeLimit: 20, points: 100 },
  { question: "Which is the largest ocean?", options: ["Atlantic","Indian","Arctic","Pacific"], correctAnswer: 3, timeLimit: 15, points: 100 },
  { question: "Who invented the World Wide Web?", options: ["Bill Gates","Steve Jobs","Tim Berners-Lee","Linus Torvalds"], correctAnswer: 2, timeLimit: 20, points: 150 },
  { question: "What does HTTP stand for?", options: ["HyperText Transfer Protocol","High Tech Transfer","Hyper Transfer Text","Host Text Transfer"], correctAnswer: 0, timeLimit: 20, points: 100 },
  { question: "Which movie features 'Let It Go'?", options: ["Tangled","Moana","Frozen","Brave"], correctAnswer: 2, timeLimit: 15, points: 100 },
];

const AVATARS = ['🦊','🐺','🦁','🐯','🐻','🐼','🦄','🐉','🦅','🦋','🐬','🦉'];

export default function LobbyPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { emit, on, off, isConnected } = useSocket();
  const { user } = useAuth();
  const { play } = useSounds();

  const [players, setPlayers] = useState([]);
  const [chat, setChat] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [starting, setStarting] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [copied, setCopied] = useState(false);
  const [joined, setJoined] = useState(false);
  const [roomQuiz, setRoomQuiz] = useState(null);

  useEffect(() => {
    if (!isConnected || joined) return;
    // Join the room via socket
    emit('join_room', {
      roomCode,
      username: user?.username || 'Player',
      avatar: user?.avatar || AVATARS[Math.floor(Math.random() * AVATARS.length)],
    });
    setJoined(true);
  }, [isConnected, roomCode, user, emit, joined]);

  useEffect(() => {
    const handleRoomJoined = ({ room }) => {
      setPlayers(room.players || []);
      setRoomQuiz(room.quiz || null);
    };

    const handlePlayerJoined = ({ players: newPlayers, newPlayer }) => {
      setPlayers(newPlayers);
      play('join');
      setChat(c => [...c, {
        type: 'system',
        message: `${newPlayer.username} joined the battle!`,
        timestamp: Date.now(),
      }]);
    };

    const handlePlayerLeft = ({ players: remaining, username }) => {
      setPlayers(remaining);
      setChat(c => [...c, {
        type: 'system',
        message: `${username} left the room`,
        timestamp: Date.now(),
      }]);
    };

    const handleChatMessage = (msg) => {
      setChat(c => [...c, { ...msg, type: 'chat' }]);
    };

    const handleGameStarting = ({ countdown: cd }) => {
      setStarting(true);
      setCountdown(cd);
      const tick = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(tick);
            navigate(`/game/${roomCode}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const handleError = ({ message }) => {
      alert(`Error: ${message}`);
      navigate('/dashboard');
    };

    on('room_joined', handleRoomJoined);
    on('player_joined', handlePlayerJoined);
    on('player_left', handlePlayerLeft);
    on('chat_message', handleChatMessage);
    on('game_starting', handleGameStarting);
    on('error', handleError);

    return () => {
      off('room_joined', handleRoomJoined);
      off('player_joined', handlePlayerJoined);
      off('player_left', handlePlayerLeft);
      off('chat_message', handleChatMessage);
      off('game_starting', handleGameStarting);
      off('error', handleError);
    };
  }, [on, off, navigate, roomCode, play, user]);

  const handleStartGame = () => {
    emit('start_game', {
      roomCode,
      quizData: roomQuiz || { questions: SAMPLE_QUESTIONS, title: 'QuizBattle Round', category: 'General' },
    });
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    emit('send_chat', { roomCode, message: chatInput });
    setChatInput('');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine if current user is the first player (host)
  const currentIsHost = players.length > 0 && (
    players[0]?.userId === user?.id || players[0]?.userId === user?._id || players[0]?.username === user?.username
  );

  return (
    <div style={{ minHeight: '100vh', paddingTop: '72px', padding: '90px 24px 40px', position: 'relative' }}>
      {/* Countdown overlay */}
      <AnimatePresence>
        {starting && countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(5,8,17,0.9)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(10px)',
            }}
          >
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 'clamp(6rem, 20vw, 12rem)',
                background: 'linear-gradient(135deg, #00d4ff, #9b59ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1,
              }}
            >
              {countdown}
            </motion.div>
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1 }}
              style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginTop: 20 }}
            >
              Get Ready!
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container" style={{ maxWidth: 1000 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: 40 }}
        >
          <div className="badge badge-green" style={{ marginBottom: 16, fontSize: '0.85rem' }}>
            ● Waiting for players
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'var(--text-primary)', marginBottom: 16 }}>
            Game Lobby
          </h1>

          {/* Room Code */}
          <motion.div
            className="glass-card"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 16,
              padding: '16px 32px', cursor: 'pointer',
            }}
            onClick={copyCode}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Room Code</div>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 800,
                fontSize: '2.2rem', letterSpacing: '0.3em',
                background: 'linear-gradient(135deg, #00d4ff, #9b59ff)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>{roomCode}</div>
            </div>
            <div style={{
              padding: '8px 16px', borderRadius: 10,
              background: copied ? 'rgba(0,255,136,0.15)' : 'rgba(0,212,255,0.1)',
              border: `1px solid ${copied ? 'rgba(0,255,136,0.3)' : 'rgba(0,212,255,0.2)'}`,
              color: copied ? 'var(--neon-green)' : 'var(--neon-blue)',
              fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
            }}>
              {copied ? '✓ Copied!' : '📋 Copy'}
            </div>
          </motion.div>
        </motion.div>

        {roomQuiz && (
          <div className="glass-card" style={{ padding: 18, marginBottom: 24, border: '1px solid rgba(0,212,255,.18)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.08em' }}>Battle Quiz</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>{roomQuiz.title}</strong>
              <span className="badge badge-blue">{roomQuiz.category || 'General'} · {roomQuiz.questions?.length || 0} questions</span>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'start' }}>
          {/* Players */}
          <motion.div
            className="glass-card"
            style={{ padding: 24 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)' }}>
                Players ({players.length}/10)
              </h2>
              {/* Live indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff88' }}
                />
                <span style={{ color: 'var(--neon-green)', fontSize: '0.82rem', fontWeight: 600 }}>LIVE</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              <AnimatePresence>
                {players.map((player, i) => (
                  <motion.div
                    key={player.socketId || player.username}
                    layout
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="glass-card-sm"
                    style={{
                      padding: '16px',
                      display: 'flex', alignItems: 'center', gap: 12,
                      border: i === 0 ? '1px solid rgba(0,212,255,0.3)' : '1px solid var(--border)',
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: i === 0 ? 'rgba(0,212,255,0.15)' : 'var(--bg-card)',
                      border: i === 0 ? '1px solid rgba(0,212,255,0.3)' : '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.4rem', flexShrink: 0,
                    }}>
                      {player.avatar || '🎮'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-display)', fontWeight: 600,
                        fontSize: '0.9rem', color: 'var(--text-primary)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {player.username}
                        {i === 0 && <span style={{ color: 'var(--neon-blue)', marginLeft: 4, fontSize: '0.7rem' }}>HOST</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ready</div>
                    </div>
                  </motion.div>
                ))}

                {/* Empty slots */}
                {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
                  <motion.div
                    key={`empty-${i}`}
                    className="glass-card-sm"
                    style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 12, opacity: 0.3 }}
                    animate={{ opacity: [0.2, 0.35, 0.2] }}
                    transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: 'var(--bg-card)', border: '2px dashed var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem',
                    }}>+</div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Waiting...</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Start Button */}
            {currentIsHost && (
              <motion.div style={{ marginTop: 24 }}>
                <motion.button
                  className="btn btn-primary btn-lg btn-glow"
                  style={{ width: '100%' }}
                  onClick={handleStartGame}
                  disabled={players.length < 1 || starting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {starting ? '🚀 Starting...' : `⚡ Start Game (${players.length} player${players.length !== 1 ? 's' : ''})`}
                </motion.button>
                {players.length < 2 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 10 }}>
                    You can start solo — invite others with the room code!
                  </p>
                )}
              </motion.div>
            )}
            {!currentIsHost && (
              <motion.div
                style={{
                  marginTop: 24, textAlign: 'center', padding: '16px',
                  background: 'rgba(155,89,255,0.08)', borderRadius: 12,
                  border: '1px solid rgba(155,89,255,0.2)',
                }}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <p style={{ color: 'var(--neon-purple)', fontWeight: 600 }}>⏳ Waiting for host to start...</p>
              </motion.div>
            )}
          </motion.div>

          {/* Chat */}
          <motion.div
            className="glass-card"
            style={{ padding: 20, width: 280, display: 'flex', flexDirection: 'column', height: 420 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
              💬 Lobby Chat
            </h3>
            <div style={{
              flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
              gap: 8, marginBottom: 12, paddingRight: 4,
            }}>
              {chat.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', marginTop: 20 }}>
                  Say hello to other players! 👋
                </p>
              )}
              <AnimatePresence>
                {chat.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={msg.type === 'system' ? {
                      textAlign: 'center', fontSize: '0.75rem',
                      color: 'var(--text-muted)', padding: '4px 8px',
                      background: 'rgba(255,255,255,0.03)', borderRadius: 8,
                    } : {
                      background: 'rgba(255,255,255,0.04)', borderRadius: 10,
                      padding: '8px 12px',
                    }}
                  >
                    {msg.type === 'chat' && (
                      <>
                        <div style={{ fontSize: '0.75rem', color: 'var(--neon-blue)', fontWeight: 600, marginBottom: 2 }}>
                          {msg.avatar} {msg.username}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{msg.message}</div>
                      </>
                    )}
                    {msg.type === 'system' && msg.message}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <form onSubmit={handleSendChat} style={{ display: 'flex', gap: 8 }}>
              <input
                className="input-field"
                style={{ flex: 1, padding: '10px 12px', fontSize: '0.85rem' }}
                placeholder="Type a message..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                maxLength={200}
              />
              <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '10px 14px', flexShrink: 0 }}>
                →
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
