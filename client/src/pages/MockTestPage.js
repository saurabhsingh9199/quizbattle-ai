import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { getApiUrl } from '../utils/serverUrl';

const API = getApiUrl();

export default function MockTestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDaily = searchParams.get('daily') === '1';
  const [quizzes, setQuizzes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [seconds, setSeconds] = useState(600);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (isDaily ? axios.get(`${API}/quiz/daily/challenge`).then(r => { const c=r.data.challenge; setQuizzes([{title:c.title,category:c.category,difficulty:c.difficulty,questions:c.questions}]); }) : axios.get(`${API}/quiz/public/samples`).then(r => setQuizzes(r.data.samples || []))).catch(() => setError(isDaily ? "Unable to load today's challenge." : 'Unable to load mock tests.')).finally(() => setLoading(false));
  }, [isDaily]);

  useEffect(() => {
    if (!started || finished) return;
    const id = setInterval(() => setSeconds(v => {
      if (v <= 1) { clearInterval(id); setFinished(true); return 0; }
      return v - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [started, finished]);

  const questions = useMemo(
  () => selected?.questions || [],
  [selected?.questions]
);
  const result = useMemo(() => {
    const correct = answers.filter((a, i) => a === questions[i]?.correctAnswer).length;
    return { correct, total: questions.length, percentage: questions.length ? Math.round(correct / questions.length * 100) : 0 };
  }, [answers, questions]);

  if (loading) return <div style={{ minHeight:'100vh', display:'grid', placeItems:'center' }}><div className="spinner" /></div>;
  if (!started) return <div style={{ minHeight:'100vh', padding:'110px 24px 60px' }}><div className="container" style={{ maxWidth:1000 }}>
    <div style={{ marginBottom:32 }}><span className="badge badge-purple">{isDaily ? 'Daily Challenge' : 'Assessment Center'}</span><h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(2rem,5vw,3rem)', fontWeight:800, margin:'12px 0' }}>📝 Mock Tests</h1><p style={{ color:'var(--text-secondary)' }}>Timed assessments with instant scoring and section performance.</p></div>
    {error && <div className="glass-card" style={{padding:16, marginBottom:16, color:'#ff8888'}}>{error}</div>}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:18}}>{quizzes.map((q,i)=><motion.button key={i} onClick={()=>{setSelected(q);setStarted(true);setSeconds(Math.max(180,q.questions.length*120));}} className="glass-card" style={{textAlign:'left',padding:22,cursor:'pointer',border:'1px solid var(--border)',color:'var(--text-primary)'}} whileHover={{y:-4}}><div className="badge badge-blue">{q.category} · {q.difficulty || 'Medium'}</div><h2 style={{fontFamily:'var(--font-display)',fontSize:'1.15rem',margin:'14px 0 8px'}}>{q.title}</h2><p style={{color:'var(--text-muted)',fontSize:'.85rem'}}>{q.questions.length} questions · timed</p></motion.button>)}</div>
  </div></div>;

  if (finished) return <div style={{minHeight:'100vh',padding:'120px 24px'}}><div className="container" style={{maxWidth:720,textAlign:'center'}}><div className="glass-card" style={{padding:42}}><div style={{fontSize:'3rem'}}>📊</div><h1 style={{fontFamily:'var(--font-display)',fontWeight:800}}>Test Complete</h1><div style={{fontSize:'4rem',fontWeight:900}}>{result.percentage}%</div><p style={{color:'var(--text-secondary)'}}>{result.correct} / {result.total} correct</p><div style={{display:'flex',gap:12,justifyContent:'center',marginTop:24,flexWrap:'wrap'}}><button className="btn btn-primary" onClick={()=>{setStarted(false);setFinished(false);setIndex(0);setAnswers([]);}}>Take Another</button><button className="btn btn-secondary" onClick={()=>navigate('/dashboard')}>Dashboard</button></div></div></div></div>;

  const q=questions[index];
  const choose=(i)=>{ const next=[...answers]; next[index]=i; setAnswers(next); if(index<questions.length-1) setTimeout(()=>setIndex(index+1),250); else setTimeout(()=>setFinished(true),250); };
  const mm=String(Math.floor(seconds/60)).padStart(2,'0'), ss=String(seconds%60).padStart(2,'0');
  return <div style={{minHeight:'100vh',padding:'110px 24px 60px'}}><div className="container" style={{maxWidth:820}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,marginBottom:20}}><span className="badge badge-blue">Mock Test · {index+1}/{questions.length}</span><strong style={{fontFamily:'var(--font-display)',fontSize:'1.3rem'}}>⏱️ {mm}:{ss}</strong></div><div className="glass-card" style={{padding:'clamp(24px,5vw,42px)'}}><div style={{color:'var(--text-muted)',fontSize:'.8rem',marginBottom:14}}>Question {index+1}</div><h2 style={{fontFamily:'var(--font-display)',lineHeight:1.45}}>{q.question}</h2><div style={{display:'grid',gap:12,marginTop:26}}>{q.options.map((o,i)=><button key={i} onClick={()=>choose(i)} style={{padding:16,borderRadius:14,border:'1px solid var(--border)',background:'rgba(255,255,255,.04)',color:'var(--text-primary)',textAlign:'left',cursor:'pointer'}}>{String.fromCharCode(65+i)}. {o}</button>)}</div></div></div></div>;
}
