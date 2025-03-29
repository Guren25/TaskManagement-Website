import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

axios.defaults.baseURL = 'http://localhost:5000';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          try {
            // Verify with backend
            const response = await axios.get('/api/users/verify-token', {
              headers: {
                Authorization: `Bearer ${storedToken}`
              }
            });
            
            if (response.data.valid) {
              setUser(response.data.user);
            }
          } catch (err) {
            // Don't logout on network error, only on invalid token
            if (err.response && err.response.status === 401) {
              logout();
            }
            console.error("Auth verification error:", err);
          }
        }
      } catch (err) {
        console.error("Auth error:", err);
      } finally {
        setLoading(false);
      }
    };

    verifyUser();
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const res = await axios.post('/api/users/login', { email, password });
      
      // Make sure the token is being stored properly
      const token = res.data.token;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setToken(token);
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      console.log('Login successful:', res.data); // Add this for debugging
      return res.data;
    } catch (err) {
      console.error("Login error details:", err);
      if (err.code === 'ERR_NETWORK') {
        setError('Unable to connect to server. Please check your connection or try again later.');
      } else if (err.response?.data?.deactivated) {
        setError('Your account has been deactivated. Please contact an administrator.');
      } else {
        setError(err.response?.data?.message || "Login failed");
      }
      throw err;
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      const res = await axios.post('/api/users/register', userData);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
      throw err;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        token, 
        loading, 
        error, 
        login, 
        register, 
        logout 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);