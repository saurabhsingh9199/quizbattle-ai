import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import AppBackground from './components/layout/AppBackground';
import Navbar from './components/layout/Navbar';
import './index.css';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const LobbyPage = lazy(() => import('./pages/LobbyPage'));
const GamePage = lazy(() => import('./pages/GamePage'));
const ResultsPage = lazy(() => import('./pages/ResultsPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AdminQuizPage = lazy(() => import('./pages/AdminQuizPage'));
const AIQuizGeneratorPage = lazy(() => import('./pages/AIQuizGeneratorPage'));
const MockTestPage = lazy(() => import('./pages/MockTestPage'));
const AITutorPage = lazy(() => import('./pages/AITutorPage'));
const LearningHubPage = lazy(() => import('./pages/LearningHubPage'));
const MockTestGeneratorPage = lazy(() => import('./pages/MockTestGeneratorPage'));

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  );
  return user ? children : <Navigate to="/auth" replace />;
};

const AppRoutes = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  return (
    <>
      <AppBackground />
      <Navbar />
      <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><div className="spinner" /></div>}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={user ? <Navigate to="/dashboard" /> : <AuthPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/ai-quiz" element={<ProtectedRoute><AIQuizGeneratorPage /></ProtectedRoute>} />
        <Route path="/mock-tests" element={<ProtectedRoute><MockTestPage /></ProtectedRoute>} />
        <Route path="/learning-hub" element={<ProtectedRoute><LearningHubPage /></ProtectedRoute>} />
        <Route path="/learning-hub/mock-test" element={<ProtectedRoute><MockTestGeneratorPage /></ProtectedRoute>} />
        <Route path="/ai-tutor" element={<ProtectedRoute><AITutorPage /></ProtectedRoute>} />
        <Route path="/admin/quizzes/new" element={<ProtectedRoute>{isAdmin ? <AdminQuizPage /> : <Navigate to="/dashboard" replace />}</ProtectedRoute>} />
        <Route path="/lobby/:roomCode" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
        <Route path="/game/:roomCode" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
        <Route path="/results/:roomCode" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      </Suspense>
    </>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
