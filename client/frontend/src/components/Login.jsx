import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import Toast from './Toast';
import './Login.css';
import axios from 'axios';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, error, user } = useAuth();
  const navigate = useNavigate();

  // Show toast when there's an auth context error
  useEffect(() => {
    if (error) {
      setToast({ show: true, message: error, type: 'error' });
    }
  }, [error]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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
        // Add detailed logging
        console.log("Attempting login with:", { 
          email: formData.email, 
          passwordLength: formData.password.length,
          passwordProvided: formData.password.length > 0
        });
        
        // Pass credentials as object instead of separate parameters
        const credentials = {
          email: formData.email,
          password: formData.password
        };
        
        console.log("Sending login request to:", axios.defaults.baseURL + '/api/users/login');
        
        const response = await login(credentials);
        console.log('Login response:', response);
        
        // If login was successful, user data will be in localStorage
        if (response.success) {
          const userData = JSON.parse(localStorage.getItem('user'));
          console.log('Retrieved user data after login:', userData);
          console.log('Password change required?', userData.requirePasswordChange);
          
          // Check if the userData exists and has a role before proceeding
          if (!userData || !userData.role) {
            console.error('User data or role is missing:', userData);
            setToast({
              show: true,
              message: "Login successful but user data is incomplete. Please contact support.",
              type: 'error'
            });
            return;
          }
          
          // Handle password change requirement if needed
          if (userData.requirePasswordChange) {
            console.log(`Redirecting to change-password with userId=${userData._id}`);
            navigate(`/change-password?userId=${userData._id}`);
            return;
          } else {
            console.log('No password change required, proceeding to dashboard');
          }
          
          // Navigate based on user role
          switch (userData.role.toLowerCase()) {
            case 'admin':
            case 'administrator':
              navigate('/admin/dashboard');
              break;
            case 'engineer':
              navigate('/engineer/dashboard');
              break;
            case 'client':
              navigate('/client/dashboard');
              break;
            default:
              console.error('Unknown user role:', userData.role);
              setToast({
                show: true,
                message: `Unknown user role: ${userData.role}. Please contact support.`,
                type: 'error'
              });
              navigate('/login');
          }
        } else {
          // Login was not successful, show the error message
          setToast({
            show: true,
            message: response.error || "Login failed. Please check your credentials.",
            type: 'error'
          });
        }
      } catch (err) {
        console.error("Login error:", err);
        
        // Handle different error scenarios
        if (err.response?.data?.deactivated) {
          setToast({
            show: true, 
            message: "Your account has been deactivated. Please contact an administrator.",
            type: 'error'
          });
        } else if (err.response?.data?.message) {
          setToast({
            show: true,
            message: err.response.data.message,
            type: 'error'
          });
        } else {
          setToast({
            show: true,
            message: "Login failed. Please check your credentials and try again.",
            type: 'error'
          });
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="auth-login-container">
      <div className="auth-login-form">
        <h2 className="auth-login-title">Login</h2>
        
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
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className={`auth-form-input ${formErrors.password ? 'error' : ''}`}
              />
              <button 
                type="button" 
                className="password-toggle-btn" 
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <i className={`password-toggle-icon ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
              </button>
            </div>
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

      <Toast 
        show={toast.show} 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ ...toast, show: false })} 
      />
    </div>
  );
};

export default Login; 