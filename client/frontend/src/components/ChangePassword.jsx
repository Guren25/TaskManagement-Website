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
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
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

  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
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
          message: 'Password changed successfully. Redirecting to login...',
          type: 'success'
        });
        
        // Log the user out after changing password
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 2000);
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
            <div className="password-input-container">
              <input
                type={showNewPassword ? "text" : "password"}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="New Password"
                required
              />
              <button 
                type="button" 
                className="password-toggle-btn" 
                onClick={toggleNewPasswordVisibility}
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                <i className={`password-toggle-icon ${showNewPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm Password"
                required
              />
              <button 
                type="button" 
                className="password-toggle-btn" 
                onClick={toggleConfirmPasswordVisibility}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                <i className={`password-toggle-icon ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
              </button>
            </div>
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