import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const cards = [
  { icon: '🤖', title: 'AI Mock Test Generator', text: 'Generate a complete mock test for any subject, exam, competitive exam or custom topic.', to: '/learning-hub/mock-test', accent: '#00d4ff' },
  { icon: '📅', title: 'Daily Challenge', text: 'Attempt the daily challenge and build your consistency streak.', to: '/mock-tests?daily=1', accent: '#00ff88' },
  { icon: '🧠', title: 'AI Tutor', text: 'Ask concepts, request explanations and learn from your mistakes.', to: '/ai-tutor', accent: '#9b59ff' },
  { icon: '⚡', title: 'AI Quiz Generator', text: 'Create custom quizzes and turn them into multiplayer battles.', to: '/ai-quiz', accent: '#ff3cac' },
  { icon: '📊', title: 'My Progress', text: 'Track XP, level, accuracy, streaks and achievements.', to: '/dashboard', accent: '#ffd166' },
  { icon: '🏆', title: 'Competitive Practice', text: 'Use timed assessments to prepare for real exam-style practice.', to: '/learning-hub/mock-test', accent: '#ff8c42' },
];

export default function LearningHubPage() {
  return (
    <div style={{ minHeight: '100vh', padding: '120px 24px 70px' }}>
      <div className="container" style={{ maxWidth: 1180 }}>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <span className="badge badge-purple">LEARNING HUB</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.3rem, 5vw, 4rem)', margin: '14px 0 10px', fontWeight: 900 }}>
            Learn. Practice. <span style={{ background: 'linear-gradient(135deg,#00d4ff,#9b59ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Improve.</span>
          </h1>
          <p style={{ maxWidth: 760, color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.7 }}>
            One place for AI-generated mock tests, daily challenges, AI tutoring, custom quizzes and performance tracking.
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20, marginTop: 38 }}>
          {cards.map((card, index) => (
            <motion.div key={card.title} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
              <Link to={card.to} style={{ textDecoration: 'none' }}>
                <div className="glass-card" style={{ minHeight: 190, padding: 26, border: `1px solid ${card.accent}45`, boxShadow: `0 0 28px ${card.accent}10`, transition: 'transform .2s, box-shadow .2s' }}>
                  <div style={{ fontSize: 2.1 + 'rem', marginBottom: 14 }}>{card.icon}</div>
                  <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{card.title}</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{card.text}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="glass-card" style={{ marginTop: 26, padding: 28, border: '1px solid rgba(0,212,255,.25)', background: 'linear-gradient(135deg,rgba(0,212,255,.08),rgba(155,89,255,.08))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div className="badge" style={{ marginBottom: 10 }}>FEATURED</div>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>Build your own exam in seconds</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>Choose exam, subject, topic, difficulty, questions, duration and negative marking. AI creates the paper and you can start immediately.</p>
            </div>
            <Link to="/learning-hub/mock-test" className="btn btn-primary">Generate Mock Test →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
