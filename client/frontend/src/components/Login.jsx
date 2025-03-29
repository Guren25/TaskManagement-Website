import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, error, user } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validate = () => {
    const errors = {};
    if (!formData.email) errors.email = "Email is required";
    if (!formData.password) errors.password = "Password is required";
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validate();
    setFormErrors(errors);
    
    if (Object.keys(errors).length === 0) {
      setIsSubmitting(true);
      try {
        console.log("Attempting login with:", { email: formData.email });
        const response = await login(formData.email, formData.password);
        console.log('Login response:', response);
        if (response.requirePasswordChange) {
          navigate(`/change-password?userId=${response.user._id}`);
          return;
        }
        switch (response.user.role) {
          case 'admin':
          case 'manager':
            navigate('/admin/dashboard');
            break;
          case 'engineer':
            navigate('/engineer/dashboard');
            break;
          case 'client':
            navigate('/client/dashboard');
            break;
          default:
            console.error('Unknown user role:', response.user.role);
            navigate('/login');
        }
      } catch (err) {
        console.error("Login error details:", err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="auth-login-container">
      <div className="auth-login-form">
        <h2 className="auth-login-title">Login</h2>
        
        {error && <div className="auth-error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="auth-form-group">
            <label className="auth-form-label" htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className={`auth-form-input ${formErrors.email ? 'error' : ''}`}
            />
            {formErrors.email && <span className="auth-error-text">{formErrors.email}</span>}
          </div>
          
          <div className="auth-form-group">
            <label className="auth-form-label" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className={`auth-form-input ${formErrors.password ? 'error' : ''}`}
            />
            {formErrors.password && <span className="auth-error-text">{formErrors.password}</span>}
          </div>
          
          <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
          
          <div className="auth-links">
            <Link to="/forgot-password" className="auth-forgot-password">
              Forgot Password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 