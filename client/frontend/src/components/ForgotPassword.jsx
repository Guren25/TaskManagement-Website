import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const response = await axios.post('/api/users/forgot-password', { email });
      setMessage('Password reset instructions have been sent to your email.');
      setIsError(false);
      setEmail('');
    } catch (error) {
      setMessage(error.response?.data?.message || 'An error occurred. Please try again.');
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-login-container">
      <div className="auth-login-form">
        <h2 className="auth-login-title">Reset Password</h2>
        
        {message && (
          <div className={`auth-message ${isError ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
        
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
    </div>
  );
};

export default ForgotPassword; 