import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedEngineerRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="loading-indicator">Loading...</div>;
  
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'engineer') {
    return <Navigate to="/login" />;
  }
  
  return children;
};

export default ProtectedEngineerRoute; 