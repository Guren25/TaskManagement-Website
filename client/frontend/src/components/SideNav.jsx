import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './SideNav.css';

const SideNav = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState('');
  
  useEffect(() => {
    // Get user data from localStorage when component mounts
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData && userData.role) {
      setUserRole(userData.role.toLowerCase());
    }
  }, []);
  
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };
  
  // Check if user is admin
  const isAdmin = userRole === 'admin' || userRole === 'administrator';
  
  return (
    <div className="side-nav">
      <div className="top-section">
        
        <div className="nav-items">
          <NavLink 
            to="/admin/dashboard" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title="Dashboard"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </NavLink>
          
          {/* Only show personnel icon for admin roles */}
          {isAdmin && (
            <NavLink 
              to="/admin/personnel" 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title="Personnel"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </NavLink>
          )}
        </div>
      </div>
      
      {/* Logout button at the bottom */}
      <div className="logout-container">
        <button className="logout-button" onClick={handleLogout} title="Logout">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SideNav; 