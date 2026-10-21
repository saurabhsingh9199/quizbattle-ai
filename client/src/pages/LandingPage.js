import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
};
const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const features = [
  { icon: '⚡', title: 'Real-Time Battle', desc: 'Compete live with players worldwide. Every second counts.' },
  { icon: '🏆', title: 'Dynamic Leaderboards', desc: 'Watch rankings shift in real-time as answers come in.' },
  { icon: '🎯', title: '1000+ Questions', desc: 'Curated across Science, History, Pop Culture & more.' },
  { icon: '🎮', title: 'Custom Rooms', desc: 'Create private rooms for friends or join open lobbies.' },
];

const stats = [
  { value: '50K+', label: 'Players' },
  { value: '10K+', label: 'Games Played' },
  { value: '1M+', label: 'Questions Answered' },
  { value: '99.9%', label: 'Uptime' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [joinCode, setJoinCode] = useState('');

  const handleJoin = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    if (!user) { navigate('/auth'); return; }
    navigate(`/lobby/${joinCode.toUpperCase()}`);
  };

  return (
    <div style={{ minHeight: '100vh', paddingTop: '72px' }}>
      {/* ── HERO ── */}
      <section style={{
        minHeight: 'calc(100vh - 72px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '60px 24px',
        position: 'relative',
      }}>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          style={{ textAlign: 'center', maxWidth: 800 }}
        >
          {/* Badge */}
          <motion.div variants={item} style={{ marginBottom: 28 }}>
            <span className="badge badge-blue" style={{ fontSize: '0.85rem', padding: '8px 18px' }}>
              ⚡ Live Multiplayer Quiz Platform
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={item} style={{
            fontSize: 'clamp(3rem, 8vw, 5.5rem)',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            lineHeight: 1.05,
            marginBottom: 24,
            color: 'var(--text-primary)',
          }}>
            Battle Your Friends
            <br />
            <span className="gradient-text">In Real-Time Quizzes</span>
          </motion.h1>

          {/* Sub */}
          <motion.p variants={item} style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            maxWidth: 580,
            margin: '0 auto 48px',
          }}>
            Create rooms, challenge friends, and climb the leaderboard in real-time quiz battles powered by Socket.IO.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={item} style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginBottom: 48 }}>
            <motion.button
              className="btn btn-primary btn-lg btn-glow"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(user ? '/dashboard' : '/auth?tab=register')}
            >
              🚀 Create a Room
            </motion.button>
            <motion.button
              className="btn btn-secondary btn-lg"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => document.getElementById('join-section').scrollIntoView({ behavior: 'smooth' })}
            >
              🎮 Join a Game
            </motion.button>
          </motion.div>

          {/* Join Code Input */}
          <motion.div variants={item} id="join-section">
            <form onSubmit={handleJoin} style={{
              display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap',
            }}>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-field"
                  style={{
                    width: 240,
                    textAlign: 'center',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-display)',
                  }}
                  placeholder="ROOM CODE"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
              </div>
              <motion.button
                type="submit"
                className="btn btn-primary"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                disabled={!joinCode.trim()}
              >
                Join Now →
              </motion.button>
            </form>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          style={{ position: 'absolute', bottom: 32, left: '50%', x: '-50%' }}
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div style={{ width: 24, height: 40, borderRadius: 12, border: '2px solid rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
            <motion.div style={{ width: 4, height: 8, borderRadius: 2, background: 'var(--neon-blue)' }}
              animate={{ y: [0, 12, 0] }} transition={{ repeat: Infinity, duration: 2 }} />
          </div>
        </motion.div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24 }}>
            {stats.map((s, i) => (
              <motion.div
                key={i}
                className="glass-card"
                style={{ padding: '32px 24px', textAlign: 'center' }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                whileHover={{ y: -4 }}
              >
                <div style={{
                  fontSize: 'clamp(2rem, 5vw, 2.8rem)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #00d4ff, #9b59ff)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: 8,
                }}>{s.value}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '80px 24px' }}>
        <div className="container">
          <motion.div
            style={{ textAlign: 'center', marginBottom: 60 }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: 16 }}>
              Why <span className="gradient-text">QuizBattle?</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto' }}>
              Built for speed, designed for fun, engineered for competition.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {features.map((f, i) => (
              <motion.div
                key={i}
                className="glass-card glass-hover"
                style={{ padding: '32px' }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6 }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(155,89,255,0.15))',
                  border: '1px solid rgba(0,212,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.6rem', marginBottom: 20,
                }}>{f.icon}</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 10, color: 'var(--text-primary)' }}>{f.title}</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.9rem' }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BOTTOM ── */}
      <section style={{ padding: '80px 24px' }}>
        <div className="container">
          <motion.div
            className="glass-card neon-border-blue"
            style={{ padding: 'clamp(40px, 8vw, 80px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at center, rgba(0,212,255,0.06) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <h2 style={{
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontFamily: 'var(--font-display)', fontWeight: 800,
              marginBottom: 20, position: 'relative',
            }}>
              Ready to <span className="gradient-text">Battle?</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 36, position: 'relative' }}>
              Join thousands of players competing right now.
            </p>
            <motion.button
              className="btn btn-primary btn-lg btn-glow"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(user ? '/dashboard' : '/auth?tab=register')}
              style={{ position: 'relative' }}
            >
              🎮 Start Playing Free
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 24px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          © 2026 QuizBattle · Built with ⚡ React + Socket.IO
        </p>
      </footer>
    </div>
  );
}
