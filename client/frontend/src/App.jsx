import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import AdminDashboard from './components/dashboards/AdminDashboard';
import Personnel from './components/Personnel';
import EngineerDashboard from './components/Dashboards/EngineerDashboard';
import ProtectedEngineerRoute from './components/ProtectedEngineerRoute';
import ProtectedClientRoute from './components/ProtectedClientRoute';
import ClientDashboard from './components/Dashboards/ClientDashboard';
import './App.css';
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="loading-indicator">Loading...</div>;
  
  if (!user) return <Navigate to="/login" />;
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Admin/Manager Routes */}
            <Route path="/admin/dashboard" element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            } />
            
            {/* Engineer Routes */}
            <Route path="/engineer/dashboard" element={
              <ProtectedEngineerRoute>
                <EngineerDashboard />
              </ProtectedEngineerRoute>
            } />
            
            {/* Client Routes */}
            <Route path="/client/dashboard" element={
              <ProtectedClientRoute>
                <ClientDashboard />
              </ProtectedClientRoute>
            } />
            
            <Route path="/admin/personnel" element={
              <ProtectedAdminRoute>
                <Personnel />
              </ProtectedAdminRoute>
            } />
            
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
