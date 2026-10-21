import React, { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

// Confetti using canvas
function Confetti({ active }) {
  const canvasRef = useRef(null);
  const particles = useRef([]);
  const animRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#00d4ff', '#9b59ff', '#ff3cac', '#00ff88', '#ffd700', '#ff8c42'];
    particles.current = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -20,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 3 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 5,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.current.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.vy += 0.05; // gravity
      });
      particles.current = particles.current.filter(p => p.y < canvas.height + 20);
      if (particles.current.length > 0) animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100 }}
    />
  );
}

const MEDAL = { 0: '🥇', 1: '🥈', 2: '🥉' };
const RANK_COLORS = {
  0: { bg: 'rgba(255,215,0,0.12)', border: 'rgba(255,215,0,0.4)', text: '#ffd700' },
  1: { bg: 'rgba(192,192,192,0.10)', border: 'rgba(192,192,192,0.3)', text: '#c0c0c0' },
  2: { bg: 'rgba(205,127,50,0.10)', border: 'rgba(205,127,50,0.3)', text: '#cd7f32' },
};

export default function ResultsPage() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { emit } = useSocket();
  const { user } = useAuth();

  const leaderboard = location.state?.leaderboard || [];
  const winner = location.state?.winner || leaderboard[0];
  const [showConfetti, setShowConfetti] = useState(true);
  const [showScores, setShowScores] = useState(false);

  const myRank = leaderboard.findIndex(p => p.username === user?.username);

  useEffect(() => {
    const t1 = setTimeout(() => setShowScores(true), 600);
    const t2 = setTimeout(() => setShowConfetti(false), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handlePlayAgain = () => {
    emit('play_again', { roomCode });
    navigate(`/lobby/${roomCode}`);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <Confetti active={showConfetti} />

      <div style={{ width: '100%', maxWidth: 640, position: 'relative', zIndex: 1 }}>
        {/* Winner Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ textAlign: 'center', marginBottom: 40 }}
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: 3, duration: 0.5, delay: 0.5 }}
            style={{ fontSize: '5rem', marginBottom: 16, display: 'block' }}
          >
            🏆
          </motion.div>

          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            background: 'linear-gradient(135deg, #ffd700, #ff8c42)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: 12,
          }}>
            Game Over!
          </h1>

          {winner && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}
            >
              {winner.avatar} <strong style={{ color: 'var(--text-primary)' }}>{winner.username}</strong> takes the crown!
            </motion.p>
          )}
        </motion.div>

        {/* My Result */}
        {myRank >= 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card"
            style={{
              padding: '20px 24px', marginBottom: 24,
              display: 'flex', alignItems: 'center', gap: 16,
              border: myRank < 3 ? `1px solid ${RANK_COLORS[myRank]?.border}` : '1px solid var(--border)',
              background: myRank < 3 ? RANK_COLORS[myRank]?.bg : 'var(--bg-card)',
            }}
          >
            <span style={{ fontSize: '2rem' }}>{MEDAL[myRank] || `#${myRank + 1}`}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)' }}>Your Result</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Rank #{myRank + 1} of {leaderboard.length}</div>
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem',
              color: myRank < 3 ? RANK_COLORS[myRank]?.text : 'var(--neon-blue)',
            }}>
              {leaderboard[myRank]?.score?.toLocaleString() || 0}
            </div>
          </motion.div>
        )}

        {/* Full Leaderboard */}
        <motion.div
          className="glass-card"
          style={{ padding: 24, marginBottom: 32 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showScores ? 1 : 0, y: showScores ? 0 : 20 }}
          transition={{ duration: 0.5 }}
        >
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', marginBottom: 20, color: 'var(--text-primary)' }}>
            📊 Final Leaderboard
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {leaderboard.map((player, i) => (
              <motion.div
                key={player.username}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: showScores ? i * 0.08 : 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px', borderRadius: 14,
                  background: i < 3 ? RANK_COLORS[i]?.bg : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${i < 3 ? RANK_COLORS[i]?.border : 'rgba(255,255,255,0.06)'}`,
                  position: 'relative', overflow: 'hidden',
                  transform: i === 0 ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {/* Rank */}
                <div style={{
                  width: 36, textAlign: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 800,
                  fontSize: i < 3 ? '1.4rem' : '1rem',
                  color: i < 3 ? RANK_COLORS[i]?.text : 'var(--text-muted)',
                }}>
                  {MEDAL[i] || `${i + 1}`}
                </div>

                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${i < 3 ? RANK_COLORS[i]?.border : 'rgba(255,255,255,0.08)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem', flexShrink: 0,
                }}>
                  {player.avatar || '🎮'}
                </div>

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontWeight: 700,
                    color: 'var(--text-primary)', fontSize: '0.95rem',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {player.username}
                    {player.username === user?.username && (
                      <span style={{
                        marginLeft: 8, fontSize: '0.7rem', padding: '2px 8px',
                        borderRadius: 6, background: 'rgba(0,212,255,0.15)',
                        color: 'var(--neon-blue)', border: '1px solid rgba(0,212,255,0.2)',
                      }}>YOU</span>
                    )}
                  </div>
                </div>

                {/* Score */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: showScores ? i * 0.08 + 0.3 : 0 }}
                  style={{
                    fontFamily: 'var(--font-display)', fontWeight: 800,
                    fontSize: '1.2rem',
                    color: i < 3 ? RANK_COLORS[i]?.text : 'var(--neon-blue)',
                  }}
                >
                  {(player.score || 0).toLocaleString()}
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>pts</span>
                </motion.div>
              </motion.div>
            ))}

            {leaderboard.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No results yet
              </div>
            )}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          style={{ display: 'flex', gap: 14 }}
        >
          <motion.button
            className="btn btn-primary btn-lg btn-glow"
            style={{ flex: 1 }}
            onClick={handlePlayAgain}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            🔄 Play Again
          </motion.button>
          <motion.button
            className="btn btn-secondary btn-lg"
            style={{ flex: 1 }}
            onClick={() => navigate('/dashboard')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            🏠 Dashboard
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
