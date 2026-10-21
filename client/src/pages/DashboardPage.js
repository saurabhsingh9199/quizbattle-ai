import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { getApiUrl } from '../utils/serverUrl';
import '../styles/Dashboard.css';

const API = getApiUrl();

export default function DashboardPage() {
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [error, setError] = useState('');
  const [leaders, setLeaders] = useState([]);
  const [leaderLoading, setLeaderLoading] = useState(true);
  const [daily, setDaily] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(true);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get(`${API}/auth/leaderboard`);
        setLeaders(res.data.leaderboard || []);
      } catch (e) { /* leaderboard is optional */ } finally { setLeaderLoading(false); }
    };
    fetchLeaderboard();
    axios.get(`${API}/quiz/daily/challenge`).then(res => setDaily(res.data.challenge || null)).catch(() => {}).finally(() => setDailyLoading(false));

    const fetchQuizzes = async () => {
      try {
        setLoadingQuizzes(true);
        const res = await axios.get(`${API}/quiz`);
        setQuizzes(res.data.quizzes || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load quizzes');
      } finally {
        setLoadingQuizzes(false);
      }
    };
    fetchQuizzes();
  }, []);

  const handleCreateRoom = async (quizId = null) => {
    setError('');
    setCreating(true);
    try {
      const id = (() => {
        if (quizId == null) return null;
        const s = typeof quizId === 'string' ? quizId : String(quizId);
        return /^[a-f0-9]{24}$/i.test(s) ? s : null;
      })();
      const res = await axios.post(`${API}/rooms/create`, { quizId: id }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      navigate(`/lobby/${res.data.code}`);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create room';
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    navigate(`/lobby/${joinCode.toUpperCase()}`);
  };

  const xp = user?.stats?.xp ?? user?.xp ?? 0;
  const level = Math.floor(xp / 500) + 1;
  const levelProgress = ((xp % 500) / 500) * 100;
  const achievements = [
    user?.stats?.gamesPlayed >= 1 && '🎮 First Game',
    user?.stats?.gamesWon >= 1 && '🏆 First Win',
    user?.stats?.gamesWon >= 5 && '🔥 5 Wins',
    user?.stats?.gamesPlayed >= 10 && '⭐ 10 Games',
    user?.stats?.correctAnswers >= 20 && '🎯 Sharpshooter',
  ].filter(Boolean);

  const statCards = [
    { label: 'Games Played', value: user?.stats?.gamesPlayed || 0, icon: '🎮', color: '#00d4ff' },
    { label: 'Games Won', value: user?.stats?.gamesWon || 0, icon: '🏆', color: '#ffd700' },
    { label: 'Total Score', value: (user?.stats?.totalScore || 0).toLocaleString(), icon: '⭐', color: '#9b59ff' },
    { label: 'Correct Answers', value: user?.stats?.correctAnswers || 0, icon: '✅', color: '#00ff88' },
    { label: 'XP', value: xp.toLocaleString(), icon: '💎', color: '#ff3cac' },
    { label: 'Level', value: level, icon: '🚀', color: '#ff8c42' },
  ];

  return (
    <div className="dashboard-page">
      <div className="container dashboard-shell">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="dashboard-hero"
          style={{ marginBottom: 32 }}
        >
          <div className="dashboard-hero-main">
            <div style={{
              width: 68, height: 68, borderRadius: 20,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.1rem',
            }}>{user?.avatar}</div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem', color: 'var(--text-primary)' }}>
                Welcome, <span className="gradient-text">{user?.username}</span>!
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>Ready to battle? Compete live, learn with AI and climb the leaderboard.</p>
              <div className="dashboard-status-row"><span>● ONLINE</span><span>⚡ Level {level}</span><span>💎 {xp.toLocaleString()} XP</span></div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="dashboard-stats"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {statCards.map((s, i) => (
            <motion.div
              key={i}
              className="glass-card dashboard-stat-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: `${s.color}20`,
                  border: `1px solid ${s.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem',
                }}>{s.icon}</div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem', color: s.color }}>{s.value}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Progress + achievements */}
        <motion.div className="glass-card neon-border-purple dashboard-panel dashboard-progress" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 240, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><strong>Level {level}</strong><span style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>{xp % 500}/500 XP</span></div>
              <div style={{ height: 10, borderRadius: 99, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}><div style={{ width: `${levelProgress}%`, height: '100%', background: 'linear-gradient(90deg,#00d4ff,#9b59ff,#ff3cac)', borderRadius: 99, transition: 'width .5s' }} /></div>
              <p style={{ color: 'var(--text-muted)', fontSize: '.8rem', marginTop: 8 }}>Earn 50 XP per game + 10 XP for each correct answer + 100 XP for a win.</p>
            </div>
            <div style={{ minWidth: 260 }}><div style={{ color: 'var(--text-muted)', fontSize: '.75rem', textTransform: 'uppercase', marginBottom: 8 }}>Achievements</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{achievements.length ? achievements.map(a => <span key={a} className="badge badge-purple">{a}</span>) : <span style={{ color: 'var(--text-muted)' }}>Play your first game to unlock badges.</span>}</div></div>
          </div>
        </motion.div>

        {/* Learning Hub */}
        <motion.div className="glass-card dashboard-panel dashboard-learning" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ marginBottom: 16 }}><h2 style={{ fontFamily:'var(--font-display)' }}>🚀 Learning Hub</h2><p style={{ color:'var(--text-secondary)', fontSize:'.85rem' }}>Practice, compete and learn with AI.</p></div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14 }}>
            <button className="glass-card-sm" style={{padding:18,textAlign:'left',cursor:'pointer',color:'var(--text-primary)'}} onClick={()=>navigate('/mock-tests')}><div style={{fontSize:'1.6rem'}}>📝</div><strong>Mock Tests</strong><div style={{fontSize:'.8rem',color:'var(--text-muted)',marginTop:5}}>Timed assessments and instant score.</div></button>
            <button className="glass-card-sm" style={{padding:18,textAlign:'left',cursor:'pointer',color:'var(--text-primary)'}} onClick={()=>navigate('/ai-tutor')}><div style={{fontSize:'1.6rem'}}>🤖</div><strong>AI Tutor</strong><div style={{fontSize:'.8rem',color:'var(--text-muted)',marginTop:5}}>Understand concepts and mistakes.</div></button>
            <button className="glass-card-sm" style={{padding:18,textAlign:'left',cursor:'pointer',color:'var(--text-primary)'}} onClick={()=>navigate('/ai-quiz')}><div style={{fontSize:'1.6rem'}}>✨</div><strong>AI Quiz Generator</strong><div style={{fontSize:'.8rem',color:'var(--text-muted)',marginTop:5}}>Generate quizzes from any topic.</div></button>
            <button className="glass-card-sm" style={{padding:18,textAlign:'left',cursor:'pointer',color:'var(--text-primary)'}} onClick={()=>daily && navigate('/mock-tests?daily=1')}><div style={{fontSize:'1.6rem'}}>📅</div><strong>Daily Challenge</strong><div style={{fontSize:'.8rem',color:'var(--text-muted)',marginTop:5}}>{dailyLoading ? "Loading today's challenge..." : daily ? `${daily.category} · ${daily.questions.length} questions` : 'Not available today'}</div></button>
          </div>
        </motion.div>

        {/* Global leaderboard */}
        <motion.div className="glass-card dashboard-panel dashboard-leaderboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}><div><h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 4 }}>🏆 Global Leaderboard</h2><p style={{ color: 'var(--text-secondary)', fontSize: '.85rem' }}>Top players ranked by XP.</p></div><span className="badge badge-blue">TOP 50</span></div>
          {leaderLoading ? <p style={{ color: 'var(--text-muted)' }}>Loading rankings...</p> : <div style={{ display: 'grid', gap: 8 }}>{leaders.slice(0, 5).map((p) => <div key={`${p.rank}-${p.username}`} style={{ display: 'grid', gridTemplateColumns: '42px 1fr auto auto', gap: 12, alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: p.username === user?.username ? 'rgba(0,212,255,.08)' : 'rgba(255,255,255,.03)', border: '1px solid var(--border)' }}><strong>#{p.rank}</strong><span>{p.avatar} <b>{p.username}</b></span><span style={{ color: '#ff3cac', fontWeight: 700 }}>{p.xp} XP</span><span style={{ color: 'var(--text-muted)' }}>Lv.{p.level}</span></div>)}{!leaders.length && <p style={{ color: 'var(--text-muted)' }}>No ranked players yet.</p>}</div>}
        </motion.div>

        {user?.role === 'admin' && (
          <motion.div
            className="glass-card neon-border-purple dashboard-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 6 }}>Admin Tools</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Create and manage quiz content.</p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/admin/quizzes/new')}>
              ➕ Add New Quiz
            </button>
          </motion.div>
        )}

        {/* AI Quiz Generator */}
        <motion.div
          className="glass-card neon-border-pink dashboard-panel dashboard-ai-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div style={{ flex: 1, minWidth: 220 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', marginBottom: 6 }}>
              🤖 AI Quiz Generator
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Create custom quizzes on any topic with AI — then play instantly with friends.
            </p>
          </div>
          <motion.button
            className="btn btn-primary btn-glow"
            onClick={() => navigate('/ai-quiz')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            ✨ Generate with AI
          </motion.button>
        </motion.div>

        {/* Actions Grid */}
        <div className="dashboard-actions-grid">
          {/* Create Room */}
          <motion.div
            className="glass-card neon-border-blue dashboard-action-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', marginBottom: 8, color: 'var(--text-primary)' }}>
              🚀 Create a Room
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
              Set up a new game room, pick a quiz, and invite friends with a shareable code.
            </p>
            {error && <p style={{ color: '#ff6b6b', marginBottom: 12, fontSize: '0.88rem' }}>⚠️ {error}</p>}
            <motion.button
              className="btn btn-primary btn-lg btn-glow"
              style={{ width: '100%' }}
              type="button"
              onClick={() => handleCreateRoom()}
              disabled={creating}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {creating ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Creating...
                </span>
              ) : '⚡ Create Room'}
            </motion.button>
          </motion.div>

          {/* Join Room */}
          <motion.div
            className="glass-card neon-border-purple dashboard-action-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', marginBottom: 8, color: 'var(--text-primary)' }}>
              🎮 Join a Room
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
              Got an invite? Enter the 6-character room code to jump right into the game.
            </p>
            <form onSubmit={handleJoin} style={{ display: 'flex', gap: 10 }}>
              <input
                className="input-field"
                style={{ flex: 1, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, textAlign: 'center' }}
                placeholder="ABC123"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
              <motion.button
                type="submit"
                className="btn btn-primary"
                disabled={joinCode.length < 6}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                Join →
              </motion.button>
            </form>
          </motion.div>
        </div>

        {/* Quiz Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="dashboard-section-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.6rem', marginBottom: 24, color: 'var(--text-primary)' }}>
            🎯 Featured Quizzes
          </h2>
          <div className="dashboard-quiz-grid">
            {loadingQuizzes && (
              <div className="glass-card" style={{ padding: 24, color: 'var(--text-secondary)' }}>
                Loading quizzes...
              </div>
            )}
            {!loadingQuizzes && quizzes.map((quiz, i) => (
              <motion.div
                key={quiz._id}
                className="glass-card glass-hover dashboard-quiz-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                whileHover={{ y: -6 }}
                onClick={() => handleCreateRoom(quiz._id)}
              >
                <div style={{
                  position: 'absolute', top: 0, right: 0,
                  width: 120, height: 120, borderRadius: '0 0 0 120px',
                  background: `radial-gradient(circle, ${i % 2 === 0 ? '#00d4ff' : '#9b59ff'}20 0%, transparent 70%)`,
                }} />
                <div style={{ marginBottom: 16, fontSize: '2rem' }}>🧠</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: 8, color: 'var(--text-primary)' }}>
                  {quiz.title}
                </h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className={`badge badge-${i === 0 ? 'blue' : i === 1 ? 'purple' : i === 2 ? 'pink' : 'orange'}`}>
                    {quiz.category}
                  </span>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    {quiz.questions?.length || 0} Qs
                  </span>
                </div>
                <div style={{
                  marginTop: 16, fontSize: '0.8rem',
                  color: quiz.difficulty === 'Easy' ? '#00ff88' : quiz.difficulty === 'Hard' ? '#ff3cac' : '#00d4ff',
                  fontWeight: 600,
                }}>
                  {quiz.difficulty && `● ${quiz.difficulty}`}
                </div>
              </motion.div>
            ))}
            {!loadingQuizzes && quizzes.length === 0 && (
              <div className="glass-card" style={{ padding: 24, color: 'var(--text-secondary)' }}>
                No quizzes found. {user?.role === 'admin' ? 'Create one from Admin Tools.' : 'Ask admin to add quizzes.'}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
