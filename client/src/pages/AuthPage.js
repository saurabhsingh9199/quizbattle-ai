import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'register' ? 'register' : 'login');
  const [mode, setMode] = useState(searchParams.get('mode') === 'admin' ? 'admin' : 'player');
  const [form, setForm] = useState({ username: '', email: '', password: '', adminKey: '' });
  const [guestName, setGuestName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, adminLogin, adminRegister, loginAsGuest } = useAuth();
  const navigate = useNavigate();

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        if (mode === 'admin') await adminLogin(form.email, form.password);
        else await login(form.email, form.password);
      } else {
        if (mode === 'admin') await adminRegister(form.username, form.email, form.password, form.adminKey);
        else await register(form.username, form.email, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setError('');
    setLoading(true);
    try {
      await loginAsGuest(guestName || undefined);
      navigate('/dashboard');
    } catch (err) {
      setError('Guest login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '100px 24px 40px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: 460 }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'linear-gradient(135deg, #00d4ff, #9b59ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem', margin: '0 auto 16px',
            boxShadow: '0 0 30px rgba(0,212,255,0.4)',
          }}>⚡</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', color: 'var(--text-primary)' }}>
            {tab === 'login' ? 'Welcome back' : 'Join the battle'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
            {tab === 'login'
              ? (mode === 'admin' ? 'Sign in to your admin account' : 'Sign in to your account')
              : (mode === 'admin' ? 'Create your admin account' : 'Create your account to start playing')}
          </p>
        </div>

        <div className="glass-card" style={{ padding: 36 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 4, background: 'rgba(255,255,255,0.04)',
            borderRadius: 12, padding: 4, marginBottom: 16,
          }}>
            {['player', 'admin'].map(t => (
              <motion.button
                key={t}
                onClick={() => { setMode(t); setError(''); }}
                style={{
                  padding: '10px',
                  borderRadius: 10, cursor: 'pointer',
                  fontFamily: 'var(--font-display)', fontWeight: 600,
                  fontSize: '0.85rem',
                  background: mode === t ? 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(155,89,255,0.2))' : 'transparent',
                  color: mode === t ? 'var(--neon-blue)' : 'var(--text-muted)',
                  border: mode === t ? '1px solid rgba(0,212,255,0.25)' : '1px solid transparent',
                  transition: 'all 0.2s',
                }}
                whileTap={{ scale: 0.97 }}
              >
                {t === 'admin' ? '🛡️ Admin' : '🎮 Player'}
              </motion.button>
            ))}
          </div>

          {/* Tab Switch */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 4, background: 'rgba(255,255,255,0.04)',
            borderRadius: 12, padding: 4, marginBottom: 28,
          }}>
            {['login', 'register'].map(t => (
              <motion.button
                key={t}
                onClick={() => { setTab(t); setError(''); }}
                style={{
                  padding: '10px',
                  borderRadius: 10, cursor: 'pointer',
                  fontFamily: 'var(--font-display)', fontWeight: 600,
                  fontSize: '0.9rem',
                  background: tab === t ? 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(155,89,255,0.2))' : 'transparent',
                  color: tab === t ? 'var(--neon-blue)' : 'var(--text-muted)',
                  border: tab === t ? '1px solid rgba(0,212,255,0.25)' : '1px solid transparent',
                  transition: 'all 0.2s',
                }}
                whileTap={{ scale: 0.97 }}
              >
                {t === 'login' ? '🔑 Sign In' : '✨ Register'}
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={tab}
              onSubmit={handleSubmit}
              initial={{ opacity: 0, x: tab === 'login' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: tab === 'login' ? 20 : -20 }}
              transition={{ duration: 0.25 }}
            >
              {tab === 'register' && (
                <div className="input-group">
                  <label className="input-label">Username</label>
                  <input
                    className="input-field"
                    type="text"
                    name="username"
                    placeholder="CoolPlayer99"
                    value={form.username}
                    onChange={handleChange}
                    required
                    minLength={3}
                  />
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Email</label>
                <input
                  className="input-field"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="input-group" style={{ marginBottom: 28 }}>
                <label className="input-label">Password</label>
                <input
                  className="input-field"
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                />
              </div>
              {mode === 'admin' && tab === 'register' && (
                <div className="input-group" style={{ marginBottom: 28 }}>
                  <label className="input-label">Admin Signup Key (optional)</label>
                  <input
                    className="input-field"
                    type="password"
                    name="adminKey"
                    placeholder="Admin invite key"
                    value={form.adminKey}
                    onChange={handleChange}
                  />
                </div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: 'rgba(255,68,68,0.12)',
                    border: '1px solid rgba(255,68,68,0.3)',
                    borderRadius: 10, padding: '12px 16px',
                    color: '#ff6b6b', fontSize: '0.88rem',
                    marginBottom: 20,
                  }}
                >
                  ⚠️ {error}
                </motion.div>
              )}

              <motion.button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginBottom: 16 }}
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    {tab === 'login' ? 'Signing in...' : 'Creating account...'}
                  </span>
                ) : (
                  tab === 'login' ? '🔑 Sign In' : '🚀 Create Account'
                )}
              </motion.button>
            </motion.form>
          </AnimatePresence>

          {mode === 'player' && <div className="divider">or</div>}

          {/* Guest Login */}
          {mode === 'player' && <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="input-field"
              placeholder="Guest nickname (optional)"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              style={{ flex: 1, padding: '12px 16px' }}
            />
            <motion.button
              className="btn btn-secondary"
              onClick={handleGuest}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ flexShrink: 0 }}
            >
              👤 Guest
            </motion.button>
          </div>}

          {mode === 'player' && <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Guest accounts expire after 24 hours
          </p>}
        </div>
      </motion.div>
    </div>
  );
}
