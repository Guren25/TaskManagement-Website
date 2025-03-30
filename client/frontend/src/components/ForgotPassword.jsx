import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Login.css';
import Toast from './Toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setToast({ show: false, message: '', type: 'info' });

    try {
      const response = await axios.post('/api/users/forgot-password', { email });
      setToast({
        show: true,
        message: 'Password reset instructions have been sent to your email.',
        type: 'success'
      });
      setEmail('');
    } catch (error) {
      setToast({
        show: true,
        message: error.response?.data?.message || 'An error occurred. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-login-container">
      <div className="auth-login-form">
        <h2 className="auth-login-title">Reset Password</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="auth-form-group">
            <label className="auth-form-label" htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="auth-form-input"
              required
            />
          </div>
          
          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Reset Instructions'}
          </button>
          
          <div className="auth-links">
            <Link to="/login" className="auth-back-to-login">
              Back to Login
            </Link>
          </div>
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

export default ForgotPassword; 