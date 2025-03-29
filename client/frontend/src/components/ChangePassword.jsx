import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './ChangePassword.css';

const ChangePassword = () => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const userId = user?._id || searchParams.get('userId');
  const resetToken = searchParams.get('token');

  console.log('Current user:', user);
  console.log('Auth state:', {
    user,
    userId,
    token: localStorage.getItem('token')
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setIsError(false);

    if (formData.newPassword !== formData.confirmPassword) {
      setIsError(true);
      setMessage('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      if (resetToken) {
        await axios.post(`/api/users/reset-password/${resetToken}`, {
          newPassword: formData.newPassword
        });
        setMessage('Password reset successful. Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        await axios.post(`/api/users/${userId}/change-password`, {
          newPassword: formData.newPassword
        });
        setMessage('Password changed successfully');
      }
      setIsError(false);
    } catch (error) {
      setIsError(true);
      setMessage(error.response?.data?.message || 'Error changing password');
      console.error('Password change error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Change Password</h3>
        
        {message && (
          <div className={`auth-message ${isError ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="password"
              name="newPassword"
              placeholder="New Password"
              value={formData.newPassword}
              onChange={handleChange}
              required
              minLength="6"
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm New Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength="6"
            />
          </div>
          <div className="modal-actions">
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword; 