import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { getApiUrl } from '../utils/serverUrl';
import { useAuth } from '../context/AuthContext';

const API = getApiUrl();
const EXAM_TYPES = ['Academic', 'Competitive Exam', 'Entrance Exam', 'Government Exam', 'Placement / Aptitude', 'Interview Assessment', 'Custom'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Expert'];
const COUNTS = [5, 10, 15, 20];

const examSuggestions = {
  'Competitive Exam': ['SSC CGL', 'SSC CHSL', 'Bank PO', 'Bank Clerk', 'Railway RRB', 'CAT', 'GATE'],
  'Entrance Exam': ['JEE Main', 'NEET', 'CUET', 'CLAT', 'MAT'],
  'Government Exam': ['UPSC', 'BPSC', 'UPPSC', 'CTET', 'State PSC'],
  'Placement / Aptitude': ['Campus Placement', 'TCS NQT', 'Accenture Assessment', 'Cognizant', 'Wipro'],
  'Academic': ['MCA', 'BCA', 'B.Tech', 'Class 10', 'Class 12'],
};

export default function MockTestGeneratorPage() {
  const { token } = useAuth();
  const [form, setForm] = useState({ examType: 'Competitive Exam', examName: 'SSC CGL', subject: '', topic: '', difficulty: 'Medium', numQuestions: 10, durationMinutes: 20, negativeMarking: 0.25, generateExplanations: true });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [mock, setMock] = useState(null);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [seconds, setSeconds] = useState(0);
  const [finished, setFinished] = useState(false);

  const questions = useMemo(
  () => mock?.questions || [],
  [mock?.questions]
);
  const current = questions[index];
  const answered = answers.filter((x) => x !== undefined).length;
  const score = useMemo(() => {
    let value = 0;
    questions.forEach((q, i) => {
      if (answers[i] === undefined) return;
      value += answers[i] === q.correctAnswer ? (q.points || 100) : -(Number(mock?.negativeMarking || 0) * (q.points || 100));
    });
    const correct = questions.reduce((n, q, i) => n + (answers[i] === q.correctAnswer ? 1 : 0), 0);
    const attempted = answers.filter((x) => x !== undefined).length;
    return { value: Math.max(0, Math.round(value * 100) / 100), correct, attempted, accuracy: attempted ? Math.round(correct / attempted * 100) : 0 };
  }, [answers, questions, mock]);

  useEffect(() => {
    if (!started || finished) return undefined;
    const id = setInterval(() => setSeconds((v) => {
      if (v <= 1) { clearInterval(id); setFinished(true); return 0; }
      return v - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [started, finished]);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const generate = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.subject.trim()) { setError('Please enter a subject.'); return; }
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/quiz/generate-mock`, form, { headers: { Authorization: `Bearer ${token}` } });
      setMock(res.data.mockTest);
      setStarted(false);
      setFinished(false);
      setIndex(0);
      setAnswers([]);
      setSeconds(form.durationMinutes * 60);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to generate the mock test. Please try again.');
    } finally { setGenerating(false); }
  };

  const start = () => { setStarted(true); setFinished(false); setSeconds(Number(mock.durationMinutes || form.durationMinutes) * 60); };
  const choose = (option) => {
    if (finished || answers[index] !== undefined) return;
    setAnswers((prev) => { const next = [...prev]; next[index] = option; return next; });
  };
  const next = () => { if (index < questions.length - 1) setIndex((v) => v + 1); else setFinished(true); };
  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (started && mock && !finished) {
    return (
      <div style={{ minHeight: '100vh', padding: '110px 20px 60px' }}>
        <div className="container" style={{ maxWidth: 1000 }}>
          <div className="glass-card" style={{ padding: 18, marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 15, flexWrap: 'wrap' }}>
              <div><span className="badge badge-purple">{mock.examType}</span><h2 style={{ margin: '8px 0 0', fontFamily: 'var(--font-display)' }}>{mock.title}</h2></div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', color: seconds < 60 ? '#ff5b6e' : '#00d4ff' }}>⏱ {formatTime(seconds)}</div>
            </div>
            <div style={{ marginTop: 15, height: 7, borderRadius: 9, background: 'rgba(255,255,255,.08)' }}><div style={{ height: '100%', width: `${((index + 1) / questions.length) * 100}%`, background: 'linear-gradient(90deg,#00d4ff,#9b59ff)', borderRadius: 9 }} /></div>
          </div>
          <motion.div key={index} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="glass-card" style={{ padding: 28 }}>
            <div style={{ color: 'var(--text-secondary)', marginBottom: 10 }}>Question {index + 1} of {questions.length} · {answered} answered</div>
            <h2 style={{ fontFamily: 'var(--font-display)', lineHeight: 1.45 }}>{current.question}</h2>
            <div style={{ display: 'grid', gap: 12, marginTop: 25 }}>
              {current.options.map((option, i) => {
                const selected = answers[index] === i;
                return <button key={option} onClick={() => choose(i)} className="glass-card" style={{ textAlign: 'left', padding: 17, cursor: answers[index] === undefined ? 'pointer' : 'default', border: selected ? '2px solid #00d4ff' : '1px solid var(--border)', background: selected ? 'rgba(0,212,255,.12)' : 'var(--bg-card)', color: 'var(--text-primary)' }}><b style={{ display: 'inline-block', width: 28 }}>{String.fromCharCode(65 + i)}.</b>{option}</button>;
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setIndex((v) => Math.max(0, v - 1))} disabled={index === 0}>← Previous</button>
              <button className="btn btn-primary" onClick={next}>{index === questions.length - 1 ? 'Submit Test' : 'Next →'}</button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (finished && mock) {
    return (
      <div style={{ minHeight: '100vh', padding: '120px 20px 70px' }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <div className="glass-card" style={{ padding: 35, textAlign: 'center' }}>
            <span className="badge badge-purple">TEST COMPLETED</span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', margin: '15px 0' }}>Your Mock Test Result</h1>
            <p style={{ color: 'var(--text-secondary)' }}>{mock.title}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, margin: '30px 0' }}>
              {[['Score', score.value], ['Correct', score.correct], ['Attempted', score.attempted], ['Accuracy', `${score.accuracy}%`], ['Total', questions.length]].map(([k,v]) => <div key={k} className="glass-card" style={{ padding: 18 }}><div style={{ color: 'var(--text-secondary)' }}>{k}</div><strong style={{ fontSize: '1.7rem', fontFamily: 'var(--font-display)' }}>{v}</strong></div>)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}><button className="btn btn-primary" onClick={() => { setStarted(true); setFinished(false); setIndex(0); setAnswers([]); setSeconds(mock.durationMinutes * 60); }}>Retake</button><button className="btn btn-secondary" onClick={() => { setMock(null); setStarted(false); setFinished(false); }}>Create Another</button></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '120px 20px 70px' }}>
      <div className="container" style={{ maxWidth: 1050 }}>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <span className="badge badge-purple">AI MOCK TEST BUILDER</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem,5vw,3.7rem)', margin: '12px 0' }}>Create Your Own Mock Test</h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 760, lineHeight: 1.7 }}>Choose a subject, exam or competitive test. AI generates a fresh timed MCQ paper with exam-focused questions, realistic options and explanations.</p>
        </motion.div>

        {error && <div className="glass-card" style={{ padding: 15, marginTop: 20, color: '#ff8b9a', borderColor: '#ff5b6e55' }}>{error}</div>}

        <form onSubmit={generate} className="glass-card" style={{ padding: 28, marginTop: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 18 }}>
            <label className="input-group"><span className="input-label">Preparation Type</span><select className="input-field" value={form.examType} onChange={(e) => { const v=e.target.value; setField('examType',v); setField('examName', examSuggestions[v]?.[0] || ''); }}>{EXAM_TYPES.map(x => <option key={x}>{x}</option>)}</select></label>
            <label className="input-group"><span className="input-label">Exam / Assessment Name</span><input className="input-field" value={form.examName} onChange={(e) => setField('examName',e.target.value)} placeholder="e.g. GATE, SSC CGL, MCA Semester" maxLength={120}/></label>
            <label className="input-group"><span className="input-label">Subject *</span><input className="input-field" value={form.subject} onChange={(e) => setField('subject',e.target.value)} placeholder="e.g. DBMS, Java, Mathematics" maxLength={120}/></label>
            <label className="input-group"><span className="input-label">Specific Topic (optional)</span><input className="input-field" value={form.topic} onChange={(e) => setField('topic',e.target.value)} placeholder="e.g. Normalization, SQL Joins" maxLength={200}/></label>
          </div>

          {examSuggestions[form.examType] && <div style={{ margin: '4px 0 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>{examSuggestions[form.examType].map(x => <button type="button" key={x} className="btn btn-secondary btn-sm" onClick={() => setField('examName',x)}>{x}</button>)}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 18 }}>
            <label className="input-group"><span className="input-label">Difficulty</span><select className="input-field" value={form.difficulty} onChange={(e)=>setField('difficulty',e.target.value)}>{DIFFICULTIES.map(x=><option key={x}>{x}</option>)}</select></label>
            <label className="input-group"><span className="input-label">Questions</span><select className="input-field" value={form.numQuestions} onChange={(e)=>setField('numQuestions',Number(e.target.value))}>{COUNTS.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
            <label className="input-group"><span className="input-label">Duration</span><select className="input-field" value={form.durationMinutes} onChange={(e)=>setField('durationMinutes',Number(e.target.value))}>{[10,20,30,45,60,90,120].map(x=><option key={x} value={x}>{x} minutes</option>)}</select></label>
            <label className="input-group"><span className="input-label">Negative Marking</span><select className="input-field" value={form.negativeMarking} onChange={(e)=>setField('negativeMarking',Number(e.target.value))}><option value="0">None</option><option value="0.25">-0.25</option><option value="0.5">-0.50</option><option value="1">-1.00</option></select></label>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 22px', color: 'var(--text-secondary)' }}><input type="checkbox" checked={form.generateExplanations} onChange={(e)=>setField('generateExplanations',e.target.checked)}/> Show explanations after the test</label>
          <button className="btn btn-primary" type="submit" disabled={generating}>{generating ? '🤖 Generating Mock Test...' : '🚀 Generate Mock Test'}</button>
        </form>

        {mock && !started && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ marginTop: 22, padding: 26, border: '1px solid rgba(0,212,255,.3)' }}>
            <span className="badge">READY</span>
            <h2 style={{ fontFamily: 'var(--font-display)', margin: '10px 0' }}>{mock.title}</h2>
            <p style={{ color: 'var(--text-secondary)' }}>{mock.description}</p>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', margin:'16px 0' }}><span className="badge">{mock.questions.length} Questions</span><span className="badge">{mock.durationMinutes} min</span><span className="badge">{mock.difficulty}</span><span className="badge">Negative: -{mock.negativeMarking}</span></div>
            <button className="btn btn-primary" onClick={start}>Start Mock Test →</button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
