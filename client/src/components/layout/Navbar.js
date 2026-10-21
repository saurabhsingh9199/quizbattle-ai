import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [learningOpen, setLearningOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Hide on game/lobby pages
  const hideOn = ['/game/', '/lobby/'];
  if (hideOn.some(p => location.pathname.startsWith(p))) return null;

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '0 24px',
        height: '72px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(5, 8, 17, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #00d4ff, #9b59ff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', boxShadow: '0 0 20px rgba(0,212,255,0.4)',
        }}>⚡</div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: '1.2rem',
          background: 'linear-gradient(135deg, #00d4ff, #9b59ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>QuizBattle</span>
      </Link>

      {/* Desktop Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            cursor: 'pointer', fontSize: '1.1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          title="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {user ? (
          <>
            <div style={{ position: 'relative' }} onMouseLeave={() => setLearningOpen(false)}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setLearningOpen((v) => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 7 }}
              >
                📚 Learning Hub <span style={{ fontSize: 10 }}>{learningOpen ? '▲' : '▼'}</span>
              </button>
              {learningOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 260, padding: 10, borderRadius: 16, background: 'rgba(10,14,28,.97)', border: '1px solid rgba(255,255,255,.1)', boxShadow: '0 20px 50px rgba(0,0,0,.45)', backdropFilter: 'blur(18px)' }}>
                  <Link to="/learning-hub" onClick={() => setLearningOpen(false)} style={{ display:'block', padding:'11px 12px', borderRadius:10, color:'var(--text-primary)', textDecoration:'none' }}>📚 Learning Home</Link>
                  <Link to="/learning-hub/mock-test" onClick={() => setLearningOpen(false)} style={{ display:'block', padding:'11px 12px', borderRadius:10, color:'var(--text-primary)', textDecoration:'none' }}>🤖 AI Mock Test Generator</Link>
                  <Link to="/mock-tests?daily=1" onClick={() => setLearningOpen(false)} style={{ display:'block', padding:'11px 12px', borderRadius:10, color:'var(--text-primary)', textDecoration:'none' }}>📅 Daily Challenge</Link>
                  <Link to="/ai-tutor" onClick={() => setLearningOpen(false)} style={{ display:'block', padding:'11px 12px', borderRadius:10, color:'var(--text-primary)', textDecoration:'none' }}>🧠 AI Tutor</Link>
                  <Link to="/ai-quiz" onClick={() => setLearningOpen(false)} style={{ display:'block', padding:'11px 12px', borderRadius:10, color:'var(--text-primary)', textDecoration:'none' }}>⚡ AI Quiz Generator</Link>
                </div>
              )}
            </div>
            <Link to="/dashboard" style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 16px', borderRadius: 12,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}>
                <span style={{ fontSize: '1.2rem' }}>{user.avatar}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {user.username}
                </span>
              </div>
            </Link>
            {user?.role === 'admin' && (
              <>
                <Link to="/admin/quizzes/new" className="btn btn-secondary btn-sm">New Quiz</Link>
                <Link to="/admin/mocks" className="btn btn-secondary btn-sm">Mock Tests</Link>
              </>
            )}
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link to="/auth" className="btn btn-secondary btn-sm">Sign In</Link>
            <Link to="/auth?tab=register" className="btn btn-primary btn-sm">Get Started</Link>
          </>
        )}
      </div>
    </motion.nav>
  );
}
