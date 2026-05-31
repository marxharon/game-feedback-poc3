import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { CollaboratorDashboard } from './pages/CollaboratorDashboard';
import { useAuthStore } from './store/authStore';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // If authenticated but wrong role, redirect to appropriate dashboard
    return <Navigate to={user.role === 'MANAGER' ? '/manager-dashboard' : '/collab-dashboard'} replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route element={<DashboardLayout />}>
          <Route 
            path="/manager-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
                <ManagerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/collab-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['COLLAB']}>
                <CollaboratorDashboard />
              </ProtectedRoute>
            } 
          />
        </Route>
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;