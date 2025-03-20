import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import './Signup.css';

const Signup = () => {
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    middlename: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'client' 
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, error } = useAuth();
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
    if (!formData.firstname) errors.firstname = "First name is required";
    if (!formData.lastname) errors.lastname = "Last name is required";
    if (!formData.email) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = "Email is invalid";
    
    if (!formData.password) errors.password = "Password is required";
    else if (formData.password.length < 6) errors.password = "Password must be at least 6 characters";
    
    if (formData.password !== formData.confirmPassword) 
      errors.confirmPassword = "Passwords do not match";
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validate();
    setFormErrors(errors);
    
    if (Object.keys(errors).length === 0) {
      setIsSubmitting(true);
      try {
        const { confirmPassword, ...userData } = formData;
        await register(userData);
        navigate('/login');
      } catch (err) {
        console.error("Registration error:", err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-form-wrapper">
        <h2>Create Your Account</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstname">First Name *</label>
              <input
                type="text"
                id="firstname"
                name="firstname"
                value={formData.firstname}
                onChange={handleChange}
                placeholder="Enter your first name"
                className={formErrors.firstname ? 'error' : ''}
              />
              {formErrors.firstname && <span className="error-text">{formErrors.firstname}</span>}
            </div>
            
            <div className="form-group">
              <label htmlFor="lastname">Last Name *</label>
              <input
                type="text"
                id="lastname"
                name="lastname"
                value={formData.lastname}
                onChange={handleChange}
                placeholder="Enter your last name"
                className={formErrors.lastname ? 'error' : ''}
              />
              {formErrors.lastname && <span className="error-text">{formErrors.lastname}</span>}
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="middlename">Middle Name (Optional)</label>
            <input
              type="text"
              id="middlename"
              name="middlename"
              value={formData.middlename}
              onChange={handleChange}
              placeholder="Enter your middle name"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className={formErrors.email ? 'error' : ''}
            />
            {formErrors.email && <span className="error-text">{formErrors.email}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password"
              className={formErrors.password ? 'error' : ''}
            />
            {formErrors.password && <span className="error-text">{formErrors.password}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              className={formErrors.confirmPassword ? 'error' : ''}
            />
            {formErrors.confirmPassword && <span className="error-text">{formErrors.confirmPassword}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="role">Account Type *</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="client">Client</option>
              <option value="engineer">Engineer</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          
          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="auth-links">
          <p>Already have an account? <Link to="/login">Login</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Signup; 