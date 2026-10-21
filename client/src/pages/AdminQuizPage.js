import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../utils/serverUrl';

const API = getApiUrl();

const emptyQuestion = () => ({
  question: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
  timeLimit: 20,
  points: 100,
  category: 'General',
});

export default function AdminQuizPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'General',
    difficulty: 'Medium',
    isPublic: true,
    questions: [emptyQuestion()],
  });

  if (user?.role !== 'admin') {
    return (
      <div style={{ minHeight: '100vh', padding: '100px 24px', display: 'flex', justifyContent: 'center' }}>
        <div className="glass-card" style={{ maxWidth: 520, width: '100%', padding: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 12 }}>Admin Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            This page is only available for admin accounts.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const updateQuestionField = (idx, field, value) => {
    setForm((prev) => {
      const questions = [...prev.questions];
      questions[idx] = { ...questions[idx], [field]: value };
      return { ...prev, questions };
    });
  };

  const updateOption = (qIdx, oIdx, value) => {
    setForm((prev) => {
      const questions = [...prev.questions];
      const options = [...questions[qIdx].options];
      options[oIdx] = value;
      questions[qIdx] = { ...questions[qIdx], options };
      return { ...prev, questions };
    });
  };

  const addQuestion = () => {
    setForm((prev) => ({ ...prev, questions: [...prev.questions, emptyQuestion()] }));
  };

  const removeQuestion = (idx) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx),
    }));
  };

  const validate = () => {
    if (!form.title.trim()) return 'Quiz title is required';
    if (form.questions.length === 0) return 'At least one question is required';
    for (let i = 0; i < form.questions.length; i += 1) {
      const q = form.questions[i];
      if (!q.question.trim()) return `Question ${i + 1} text is required`;
      if (q.options.some((o) => !o.trim())) return `All options are required for question ${i + 1}`;
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/quiz`, form);
      setSuccess('Quiz created successfully.');
      setForm({
        title: '',
        description: '',
        category: 'General',
        difficulty: 'Medium',
        isPublic: true,
        questions: [emptyQuestion()],
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '100px 24px 40px' }}>
      <div className="container" style={{ maxWidth: 960 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>Create New Quiz</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Admin-only quiz creator.</p>

        <form className="glass-card" style={{ padding: 24 }} onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Title</label>
            <input className="input-field" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          </div>
          <div className="input-group">
            <label className="input-label">Description</label>
            <textarea className="input-field" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">Category</label>
              <input className="input-field" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Difficulty</label>
              <select className="input-field" value={form.difficulty} onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}>
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Visibility</label>
              <select className="input-field" value={form.isPublic ? 'public' : 'private'} onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.value === 'public' }))}>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          {form.questions.map((q, qIdx) => (
            <div key={qIdx} className="glass-card-sm" style={{ padding: 16, marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <strong>Question {qIdx + 1}</strong>
                {form.questions.length > 1 && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeQuestion(qIdx)}>
                    Remove
                  </button>
                )}
              </div>
              <div className="input-group">
                <label className="input-label">Question text</label>
                <input className="input-field" value={q.question} onChange={(e) => updateQuestionField(qIdx, 'question', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {q.options.map((opt, oIdx) => (
                  <input
                    key={oIdx}
                    className="input-field"
                    placeholder={`Option ${oIdx + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                  />
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 10 }}>
                <select className="input-field" value={q.correctAnswer} onChange={(e) => updateQuestionField(qIdx, 'correctAnswer', Number(e.target.value))}>
                  <option value={0}>Correct: Option 1</option>
                  <option value={1}>Correct: Option 2</option>
                  <option value={2}>Correct: Option 3</option>
                  <option value={3}>Correct: Option 4</option>
                </select>
                <input className="input-field" type="number" min={5} max={90} value={q.timeLimit} onChange={(e) => updateQuestionField(qIdx, 'timeLimit', Number(e.target.value))} />
                <input className="input-field" type="number" min={10} max={1000} value={q.points} onChange={(e) => updateQuestionField(qIdx, 'points', Number(e.target.value))} />
              </div>
            </div>
          ))}

          {error && <p style={{ color: '#ff6b6b', marginTop: 12 }}>{error}</p>}
          {success && <p style={{ color: '#00ff88', marginTop: 12 }}>{success}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button type="button" className="btn btn-secondary" onClick={addQuestion}>+ Add Question</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Quiz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
