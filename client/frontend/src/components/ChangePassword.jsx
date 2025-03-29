import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Toast from './Toast';
import './ChangePassword.css';

const ChangePassword = () => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [toast, setToast] = useState({ 
    show: false, 
    message: '', 
    type: 'info' 
  });
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.newPassword !== formData.confirmPassword) {
      setToast({
        show: true,
        message: 'Passwords do not match',
        type: 'error'
      });
      setIsLoading(false);
      return;
    }

    try {
      if (resetToken) {
        await axios.post(`/api/users/reset-password/${resetToken}`, {
          newPassword: formData.newPassword
        });
        setToast({
          show: true,
          message: 'Password reset successful. Redirecting to login...',
          type: 'success'
        });
        setTimeout(() => navigate('/login'), 2000);
      } else {
        await axios.post(`/api/users/${userId}/change-password`, {
          newPassword: formData.newPassword
        });
        setToast({
          show: true,
          message: 'Password changed successfully',
          type: 'success'
        });
      }
    } catch (error) {
      setToast({
        show: true,
        message: error.response?.data?.message || 'Error changing password',
        type: 'error'
      });
      console.error('Password change error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{resetToken ? 'Reset Password' : 'Change Password'}</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="New Password"
              required
            />
          </div>
          
          <div className="form-group">
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm Password"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : resetToken ? 'Reset Password' : 'Change Password'}
          </button>
        </form>
      </div>
      
      <Toast 
        show={toast.show} 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ ...toast, show: false })} 
      />
    </div>
  );
};

export default ChangePassword; 