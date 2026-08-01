import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastContainer } from './components/ToastContainer';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Forecasts } from './pages/Forecasts';
import { Scenarios } from './pages/Scenarios';
import { Recommendations } from './pages/Recommendations';
import { DataHealth } from './pages/DataHealth';
import { Settings } from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastContainer />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forecasts"
            element={
              <ProtectedRoute>
                <Forecasts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scenarios"
            element={
              <ProtectedRoute requiredRoles={['admin', 'operator']}>
                <Scenarios />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recommendations"
            element={
              <ProtectedRoute>
                <Recommendations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/data-health"
            element={
              <ProtectedRoute>
                <DataHealth />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
