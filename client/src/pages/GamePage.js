import React, { useState, useEffect, useRef, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import { useSounds } from '../utils/sounds';


const GameTimer = memo(function GameTimer({ timeLimit, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const expiredRef = useRef(false);
  const circumference = 2 * Math.PI * 44;

  // Keep the expiry callback current without restarting the timer whenever
  // GamePage state changes (for example after selecting an answer).
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    setTimeLeft(timeLimit);
    expiredRef.current = false;
    const id = setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          clearInterval(id);
          if (!expiredRef.current) {
            expiredRef.current = true;
            onExpireRef.current?.();
          }
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timeLimit]);

  const progress = timeLimit > 0 ? timeLeft / timeLimit : 0;
  const timerColor = timeLeft <= 5 ? '#ff4444' : timeLeft <= 10 ? '#ff8c42' : '#00d4ff';
  return (
    <div style={{ position: 'relative', width: 100, height: 100 }}>
      <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle cx="50" cy="50" r="44" fill="none" stroke={timerColor} strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.2s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.6rem', color: timerColor }}>{timeLeft}</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>sec</span>
      </div>
    </div>
  );
});

const AnswerOptions = memo(function AnswerOptions({ question, selectedAnswer, correctAnswer, phase, onAnswer }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {question.options.map((option, i) => {
        const base = OPTION_COLORS[i];
        const isCorrectRevealed = correctAnswer !== null && i === correctAnswer;
        const isWrongSelected = correctAnswer !== null && i === selectedAnswer && i !== correctAnswer;
        let style = base;
        if (correctAnswer !== null) {
          if (isCorrectRevealed) style = { ...base, bg: 'rgba(0,255,136,0.2)', border: '#00ff88', glow: 'rgba(0,255,136,0.5)' };
          else if (isWrongSelected) style = { ...base, bg: 'rgba(255,68,68,0.2)', border: '#ff4444', glow: 'rgba(255,68,68,0.4)' };
          else style = { ...base, bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', glow: 'transparent' };
        } else if (selectedAnswer === i) {
          style = { ...base, bg: base.bg.replace('0.12', '0.25') };
        }
        return (
          <motion.button key={i} onClick={() => onAnswer(i)} disabled={selectedAnswer !== null || phase === 'reveal'}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            whileHover={selectedAnswer === null ? { scale: 1.03, y: -2 } : {}} whileTap={selectedAnswer === null ? { scale: 0.97 } : {}}
            style={{ padding: 'clamp(16px, 3vw, 24px)', borderRadius: 16, border: `2px solid ${style.border}`, background: style.bg,
              cursor: selectedAnswer === null ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', outline: 'none',
              transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.2s',
              boxShadow: isCorrectRevealed ? '0 0 20px rgba(0,255,136,0.4), inset 0 0 20px rgba(0,255,136,0.05)' : isWrongSelected ? '0 0 20px rgba(255,68,68,0.4)' : selectedAnswer === i ? `0 0 20px ${style.glow}` : 'none' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: isCorrectRevealed ? 'rgba(0,255,136,0.3)' : isWrongSelected ? 'rgba(255,68,68,0.3)' : selectedAnswer === i ? style.bg.replace('0.12', '0.3') : 'rgba(255,255,255,0.06)',
              border: `1px solid ${style.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem',
              color: isCorrectRevealed ? '#00ff88' : isWrongSelected ? '#ff4444' : 'var(--text-secondary)', flexShrink: 0 }}>
              {isCorrectRevealed ? '✓' : isWrongSelected ? '✗' : base.label}
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'clamp(0.85rem, 2vw, 1rem)', color: 'var(--text-primary)', lineHeight: 1.3 }}>{option}</span>
          </motion.button>
        );
      })}
    </div>
  );
});

const OPTION_COLORS = [
  { bg: 'rgba(0,212,255,0.12)', border: 'rgba(0,212,255,0.3)', glow: 'rgba(0,212,255,0.4)', label: 'A' },
  { bg: 'rgba(155,89,255,0.12)', border: 'rgba(155,89,255,0.3)', glow: 'rgba(155,89,255,0.4)', label: 'B' },
  { bg: 'rgba(255,60,172,0.12)', border: 'rgba(255,60,172,0.3)', glow: 'rgba(255,60,172,0.4)', label: 'C' },
  { bg: 'rgba(255,140,66,0.12)', border: 'rgba(255,140,66,0.3)', glow: 'rgba(255,140,66,0.4)', label: 'D' },
];

export default function GamePage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { emit, on, off } = useSocket();
  const { play } = useSounds();

  const [phase, setPhase] = useState('waiting'); // waiting | question | reveal | gameover
  const [question, setQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeLimit, setTimeLimit] = useState(20);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myScore, setMyScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(1);
  const [lastResult, setLastResult] = useState(null); // { isCorrect, points }
  const startTimeRef = useRef(null);
  const answerLockedRef = useRef(false);

  useEffect(() => {
    emit('sync_game_state', { roomCode });

    const handleQuestionStart = (data) => {
      setPhase('question');
      setQuestion(data);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setTimeLimit(data.timeLimit);
      setSelectedAnswer(null);
      answerLockedRef.current = false;
      setCorrectAnswer(null);
      setLastResult(null);
      setAnsweredCount(0);
      startTimeRef.current = Date.now();

    };

    const handleAnswerConfirmed = ({ isCorrect, points, correctAnswer: ca }) => {
      setCorrectAnswer(ca);
      setLastResult({ isCorrect, points });
      setMyScore(s => s + points);
      play(isCorrect ? 'correct' : 'wrong');
    };

    const handleAnswerUpdate = ({ answeredCount: ac, totalPlayers: tp }) => {
      setAnsweredCount(ac);
      setTotalPlayers(tp);
    };

    const handleQuestionEnd = ({ correctAnswer: ca, leaderboard: lb }) => {
      setCorrectAnswer(ca);
      setLeaderboard(lb);
      setPhase('reveal');
    };

    const handleGameOver = ({ leaderboard: lb, winner }) => {
      setLeaderboard(lb);
      setPhase('gameover');
      play('win');
      setTimeout(() => navigate(`/results/${roomCode}`, { state: { leaderboard: lb, winner } }), 2000);
    };

    on('question_start', handleQuestionStart);
    on('answer_confirmed', handleAnswerConfirmed);
    on('answer_update', handleAnswerUpdate);
    on('question_end', handleQuestionEnd);
    on('game_over', handleGameOver);

    return () => {
      off('question_start', handleQuestionStart);
      off('answer_confirmed', handleAnswerConfirmed);
      off('answer_update', handleAnswerUpdate);
      off('question_end', handleQuestionEnd);
      off('game_over', handleGameOver);
    };
  }, [emit, on, off, navigate, roomCode, play]);

  const handleAnswer = (index) => {
    if (answerLockedRef.current || selectedAnswer !== null || phase !== 'question') return;
    answerLockedRef.current = true;
    setSelectedAnswer(index);
    const timeSpent = (Date.now() - startTimeRef.current) / 1000;
    emit('submit_answer', { roomCode, answer: index, timeSpent });
  };


  if (phase === 'waiting') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div style={{ textAlign: 'center' }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <div className="spinner" style={{ width: 60, height: 60, margin: '0 auto 20px' }} />
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Loading game...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      {/* Top Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          padding: '16px 24px',
          background: 'rgba(5,8,17,0.9)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 50,
        }}
      >
        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 500 }}>QUESTION</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: totalQuestions }).map((_, i) => (
              <motion.div
                key={i}
                style={{
                  height: 6, borderRadius: 3,
                  background: i < questionIndex ? 'var(--neon-green)'
                    : i === questionIndex ? 'var(--neon-blue)'
                    : 'rgba(255,255,255,0.1)',
                  width: i === questionIndex ? 24 : 16,
                  transition: 'all 0.3s',
                }}
              />
            ))}
          </div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
            {questionIndex + 1}/{totalQuestions}
          </span>
        </div>

        {/* Score */}
        <div
          style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem' }}
          aria-live="polite"
        >
          ⭐ {myScore.toLocaleString()}
        </div>

        {/* Answered count */}
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {answeredCount}/{totalPlayers} answered
        </div>
      </motion.div>

      {/* Main Content */}
      <div style={{ width: '100%', maxWidth: 760, marginTop: 60 }}>
        <AnimatePresence mode="wait">
          {(phase === 'question' || phase === 'reveal') && question && (
            <motion.div
              key={`q-${questionIndex}`}
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.97 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Timer + Category */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <span className="badge badge-blue">{question.category || 'General'}</span>

                {/* Circular Timer - isolated so the 1-second timer does not repaint the answer UI */}
                <GameTimer timeLimit={timeLimit} onExpire={() => {
                if (!answerLockedRef.current && phase === 'question' && selectedAnswer === null) {
                  answerLockedRef.current = true;
                  setSelectedAnswer(-1);
                  emit('submit_answer', { roomCode, answer: -1, timeSpent: timeLimit });
                }
              }} />
              </div>

              {/* Question Card */}
              <motion.div
                className="glass-card"
                style={{
                  padding: 'clamp(24px, 5vw, 48px)',
                  marginBottom: 24,
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.05)',
                  minHeight: 140,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'radial-gradient(ellipse at center, rgba(0,212,255,0.05) 0%, transparent 70%)',
                }} />
                <h2 style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 'clamp(1.1rem, 3vw, 1.6rem)',
                  lineHeight: 1.4,
                  color: 'var(--text-primary)',
                  position: 'relative',
                }}>
                  {question.question}
                </h2>
              </motion.div>

              {/* Answer Options - memoized to avoid unnecessary renders while the timer ticks */}
              <AnswerOptions
                question={question}
                selectedAnswer={selectedAnswer}
                correctAnswer={correctAnswer}
                phase={phase}
                onAnswer={handleAnswer}
              />

              {selectedAnswer !== null && selectedAnswer >= 0 && (
                <div style={{
                  marginTop: 12, textAlign: 'center', fontSize: '0.82rem',
                  color: 'var(--text-muted)', fontWeight: 600
                }} aria-live="polite">
                  Selected answer: <strong style={{ color: 'var(--text-primary)' }}>
                    {OPTION_COLORS[selectedAnswer]?.label}
                  </strong>
                </div>
              )}

              {/* Result feedback */}
              <AnimatePresence>
                {lastResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    style={{
                      textAlign: 'center',
                      marginTop: 24, padding: '16px 24px',
                      borderRadius: 16,
                      background: lastResult.isCorrect ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,68,0.1)',
                      border: `1px solid ${lastResult.isCorrect ? 'rgba(0,255,136,0.3)' : 'rgba(255,68,68,0.3)'}`,
                    }}
                  >
                    <span style={{
                      fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem',
                      color: lastResult.isCorrect ? '#00ff88' : '#ff4444',
                    }}>
                      {lastResult.isCorrect ? `✓ Correct! +${lastResult.points} pts` : '✗ Wrong answer'}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reveal leaderboard snippet */}
              {phase === 'reveal' && leaderboard.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card"
                  style={{ marginTop: 24, padding: 20 }}
                >
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                    📊 Current Rankings
                  </h3>
                  {leaderboard.slice(0, 5).map((p, i) => (
                    <motion.div
                      key={p.username}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 0',
                        borderBottom: i < leaderboard.slice(0, 5).length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <span style={{
                        width: 24, fontFamily: 'var(--font-display)', fontWeight: 800,
                        color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--text-muted)',
                        textAlign: 'center', fontSize: '0.9rem',
                      }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </span>
                      <span style={{ flex: 1, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {p.avatar} {p.username}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-display)', fontWeight: 800,
                        color: 'var(--neon-blue)', fontSize: '1rem',
                      }}>
                        {p.score.toLocaleString()}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
