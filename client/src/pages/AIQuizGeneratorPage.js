import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../utils/serverUrl';
import '../styles/AIQuizGenerator.css';

const API = getApiUrl();

const CATEGORIES = [
  'General',
  'Geography',
  'Technology',
  'Science',
  'History',
  'Entertainment',
  'Sports',
  'Literature',
  'Mathematics',
  'Art & Culture',
  'Business',
  'Health',
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Expert'];
const QUESTION_COUNTS = [5, 10, 15, 20];

const difficultyColor = (d) => {
  if (d === 'Easy') return '#00ff88';
  if (d === 'Medium') return '#00d4ff';
  if (d === 'Hard') return '#9b59ff';
  return '#ff3cac';
};

export default function AIQuizGeneratorPage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [form, setForm] = useState({
    topic: '',
    category: 'General',
    customCategory: '',
    difficulty: 'Medium',
    numQuestions: 10,
    generateExplanations: true,
  });

  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [savedQuizId, setSavedQuizId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editQuiz, setEditQuiz] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resolvedCategory = form.category === 'Custom'
    ? form.customCategory.trim()
    : form.category;

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');
    setSavedQuizId(null);

    if (!form.topic.trim()) {
      setError('Please enter a topic for your quiz.');
      return;
    }
    if (form.category === 'Custom' && !form.customCategory.trim()) {
      setError('Please enter a custom category.');
      return;
    }

    setGenerating(true);
    try {
      const res = await axios.post(
        `${API}/quiz/generate`,
        {
          topic: form.topic.trim(),
          category: resolvedCategory,
          difficulty: form.difficulty,
          numQuestions: form.numQuestions,
          generateExplanations: form.generateExplanations,
        },
        { headers: authHeaders }
      );
      setGeneratedQuiz(res.data.quiz);
      setEditQuiz(JSON.parse(JSON.stringify(res.data.quiz)));
      setIsEditing(false);
    } catch (err) {
      const code = err.response?.data?.code;
      const msg = err.response?.data?.message || 'Unable to generate the quiz right now. Please try again.';
      if (code === 'APP_RATE_LIMIT') setError(`⏳ ${msg}`);
      else if (code === 'GEMINI_RATE_LIMIT') setError(`⏳ ${msg}`);
      else if (code === 'GEMINI_QUOTA') setError(`💳 ${msg}`);
      else if (code === 'INVALID_INPUT') setError(`⚠️ ${msg}`);
      else if (code === 'INVALID_AI_RESPONSE') setError(`🤖 AI returned invalid data. Please try again.`);
      else if (code === 'API_AUTH' || code === 'API_NOT_CONFIGURED') setError(`🔌 ${msg}`);
      else if (code === 'INVALID_MODEL') setError(`⚙️ ${msg}`);
      else if (code === 'NETWORK_ERROR' || code === 'API_ERROR') setError(`🔌 ${msg}`);
      else setError(`❌ ${msg}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    const quizToSave = isEditing ? editQuiz : generatedQuiz;
    if (!quizToSave) return;

    setSaving(true);
    try {
      let res;
      if (savedQuizId) {
        res = await axios.put(
          `${API}/quiz/${savedQuizId}/update-generated`,
          quizToSave,
          { headers: authHeaders }
        );
      } else {
        res = await axios.post(
          `${API}/quiz/save-generated`,
          quizToSave,
          { headers: authHeaders }
        );
        setSavedQuizId(res.data.quiz._id);
      }
      setGeneratedQuiz(res.data.quiz);
      setEditQuiz(JSON.parse(JSON.stringify(res.data.quiz)));
      setIsEditing(false);
      setSuccess('✅ Quiz saved successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  const handlePlayNow = async () => {
    setError('');
    setPlaying(true);
    try {
      let quizId = savedQuizId;
      if (!quizId) {
        const quizToSave = isEditing ? editQuiz : generatedQuiz;
        const saveRes = await axios.post(
          `${API}/quiz/save-generated`,
          quizToSave,
          { headers: authHeaders }
        );
        quizId = saveRes.data.quiz._id;
        setSavedQuizId(quizId);
        setGeneratedQuiz(saveRes.data.quiz);
      }

      const roomRes = await axios.post(
        `${API}/rooms/create`,
        { quizId },
        { headers: authHeaders }
      );
      navigate(`/lobby/${roomRes.data.code}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start game');
    } finally {
      setPlaying(false);
    }
  };

  const updateEditField = (field, value) => {
    setEditQuiz((prev) => ({ ...prev, [field]: value }));
  };

  const updateQuestion = (qIdx, field, value) => {
    setEditQuiz((prev) => {
      const questions = [...prev.questions];
      questions[qIdx] = { ...questions[qIdx], [field]: value };
      return { ...prev, questions };
    });
  };

  const updateOption = (qIdx, oIdx, value) => {
    setEditQuiz((prev) => {
      const questions = [...prev.questions];
      const options = [...questions[qIdx].options];
      options[oIdx] = value;
      questions[qIdx] = { ...questions[qIdx], options };
      return { ...prev, questions };
    });
  };

  const displayQuiz = isEditing ? editQuiz : generatedQuiz;

  return (
    <div className="ai-quiz-page">
      <div className="container ai-quiz-container">
        {/* Header */}
        <motion.div
          className="ai-quiz-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard')}>
            ← Back
          </button>
          <div className="ai-quiz-header-text">
            <h1>
              <span className="ai-icon">🤖</span>
              AI Quiz Generator
            </h1>
            <p>Create custom quizzes powered by AI — then battle with friends!</p>
          </div>
        </motion.div>

        <div className="ai-quiz-layout">
          {/* Generator Form */}
          <motion.div
            className="glass-card neon-border-blue ai-quiz-form-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="ai-section-title">⚡ Configure Your Quiz</h2>

            <form onSubmit={handleGenerate} className="ai-quiz-form">
              <div className="input-group">
                <label className="input-label">Topic</label>
                <input
                  className="input-field"
                  placeholder="e.g. Space Exploration, World War II, Python Programming"
                  value={form.topic}
                  onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))}
                  maxLength={200}
                  disabled={generating}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Category</label>
                <select
                  className="input-field"
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  disabled={generating}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="Custom">Custom...</option>
                </select>
              </div>

              {form.category === 'Custom' && (
                <div className="input-group">
                  <label className="input-label">Custom Category</label>
                  <input
                    className="input-field"
                    placeholder="Enter your category"
                    value={form.customCategory}
                    onChange={(e) => setForm((p) => ({ ...p, customCategory: e.target.value }))}
                    maxLength={80}
                    disabled={generating}
                  />
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Difficulty</label>
                <div className="ai-pill-group">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`ai-pill ${form.difficulty === d ? 'active' : ''}`}
                      style={{
                        '--pill-color': difficultyColor(d),
                      }}
                      onClick={() => setForm((p) => ({ ...p, difficulty: d }))}
                      disabled={generating}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Number of Questions</label>
                <div className="ai-pill-group">
                  {QUESTION_COUNTS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`ai-pill ${form.numQuestions === n ? 'active' : ''}`}
                      onClick={() => setForm((p) => ({ ...p, numQuestions: n }))}
                      disabled={generating}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Question Type</label>
                <div className="ai-type-badge">Multiple Choice (MCQ)</div>
              </div>

              <div className="input-group">
                <label className="input-label">Generate Explanations</label>
                <div className="ai-toggle-group">
                  <button
                    type="button"
                    className={`ai-toggle ${form.generateExplanations ? 'active' : ''}`}
                    onClick={() => setForm((p) => ({ ...p, generateExplanations: true }))}
                    disabled={generating}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={`ai-toggle ${!form.generateExplanations ? 'active' : ''}`}
                    onClick={() => setForm((p) => ({ ...p, generateExplanations: false }))}
                    disabled={generating}
                  >
                    No
                  </button>
                </div>
              </div>

              {error && !generatedQuiz && (
                <div className="ai-error-banner">{error}</div>
              )}

              <motion.button
                type="submit"
                className="btn btn-primary btn-lg btn-glow ai-generate-btn"
                disabled={generating || !form.topic.trim()}
                whileHover={{ scale: generating ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {generating ? (
                  <span className="ai-loading">
                    <div className="spinner ai-spinner" />
                    🤖 AI is creating your quiz...
                  </span>
                ) : (
                  '✨ Generate Quiz'
                )}
              </motion.button>
            </form>
          </motion.div>

          {/* Preview Panel */}
          <motion.div
            className="ai-quiz-preview-panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <AnimatePresence mode="wait">
              {generating && (
                <motion.div
                  key="loading"
                  className="glass-card ai-preview-placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="ai-loading-orb" />
                  <h3>🤖 AI is creating your quiz...</h3>
                  <p>Crafting {form.numQuestions} {form.difficulty.toLowerCase()} questions about "{form.topic}"</p>
                  <div className="ai-loading-dots">
                    <span /><span /><span />
                  </div>
                </motion.div>
              )}

              {!generating && !displayQuiz && (
                <motion.div
                  key="empty"
                  className="glass-card ai-preview-placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="ai-empty-icon">🧠</div>
                  <h3>Your quiz preview will appear here</h3>
                  <p>Fill in the form and hit Generate to create a custom AI-powered quiz.</p>
                </motion.div>
              )}

              {!generating && displayQuiz && (
                <motion.div
                  key="preview"
                  className="glass-card neon-border-purple ai-preview-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Preview Header */}
                  <div className="ai-preview-header">
                    {isEditing ? (
                      <input
                        className="input-field ai-title-input"
                        value={editQuiz.title}
                        onChange={(e) => updateEditField('title', e.target.value)}
                      />
                    ) : (
                      <h2>{displayQuiz.title}</h2>
                    )}
                    <div className="ai-preview-meta">
                      <span className="badge badge-purple">{displayQuiz.category}</span>
                      <span
                        className="badge"
                        style={{
                          background: `${difficultyColor(displayQuiz.difficulty)}20`,
                          color: difficultyColor(displayQuiz.difficulty),
                          border: `1px solid ${difficultyColor(displayQuiz.difficulty)}40`,
                        }}
                      >
                        {displayQuiz.difficulty}
                      </span>
                      <span className="badge badge-blue">
                        {displayQuiz.questions?.length || 0} Questions
                      </span>
                      {savedQuizId && <span className="badge badge-green">Saved</span>}
                    </div>
                  </div>

                  {error && <div className="ai-error-banner">{error}</div>}
                  {success && <div className="ai-success-banner">{success}</div>}

                  {/* Questions */}
                  <div className="ai-questions-list">
                    {displayQuiz.questions?.map((q, qIdx) => (
                      <div key={qIdx} className="ai-question-card glass-card-sm">
                        <div className="ai-question-number">Q{qIdx + 1}</div>
                        {isEditing ? (
                          <input
                            className="input-field"
                            value={editQuiz.questions[qIdx].question}
                            onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                            style={{ marginBottom: 12 }}
                          />
                        ) : (
                          <p className="ai-question-text">{q.question}</p>
                        )}

                        <div className="ai-options-grid">
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`ai-option ${!isEditing && oIdx === q.correctAnswer ? 'correct' : ''}`}
                            >
                              {isEditing ? (
                                <input
                                  className="input-field"
                                  value={editQuiz.questions[qIdx].options[oIdx]}
                                  onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                                />
                              ) : (
                                <>
                                  <span className="ai-option-letter">
                                    {String.fromCharCode(65 + oIdx)}
                                  </span>
                                  <span>{opt}</span>
                                  {!isEditing && oIdx === q.correctAnswer && (
                                    <span className="ai-correct-mark">✓</span>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>

                        {isEditing && (
                          <select
                            className="input-field ai-correct-select"
                            value={editQuiz.questions[qIdx].correctAnswer}
                            onChange={(e) => updateQuestion(qIdx, 'correctAnswer', Number(e.target.value))}
                          >
                            {[0, 1, 2, 3].map((i) => (
                              <option key={i} value={i}>
                                Correct: Option {String.fromCharCode(65 + i)}
                              </option>
                            ))}
                          </select>
                        )}

                        {q.explanation && !isEditing && (
                          <div className="ai-explanation">
                            <span className="ai-explanation-label">💡 Explanation</span>
                            <p>{q.explanation}</p>
                          </div>
                        )}

                        {isEditing && form.generateExplanations && (
                          <textarea
                            className="input-field ai-explanation-input"
                            placeholder="Explanation (optional)"
                            value={editQuiz.questions[qIdx].explanation || ''}
                            onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="ai-action-bar">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        if (isEditing) {
                          setEditQuiz(JSON.parse(JSON.stringify(generatedQuiz)));
                          setIsEditing(false);
                        } else {
                          setEditQuiz(JSON.parse(JSON.stringify(generatedQuiz)));
                          setIsEditing(true);
                        }
                      }}
                    >
                      {isEditing ? 'Cancel Edit' : '✏️ Edit Quiz'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : '💾 Save Quiz'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-glow"
                      onClick={handlePlayNow}
                      disabled={playing}
                    >
                      {playing ? 'Starting...' : '🎮 Play Now'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleGenerate}
                      disabled={generating}
                    >
                      🔄 Regenerate
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
