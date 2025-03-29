import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { initializeSocket, disconnectSocket } from '../services/socket';

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

  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/users/login', credentials);
      if (response.data.token) {
        // Store token with proper expiration
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Initialize socket connection with explicit logging
        console.log('Initializing socket after successful login');
        const socketInstance = initializeSocket(response.data.token);
        console.log('Socket initialization complete, instance:', socketInstance ? 'created' : 'failed');
        
        setUser(response.data.user);
        setToken(response.data.token);
        
        setLoading(false);
        return { success: true };
      } else {
        setError('Authentication failed. No token received.');
        setLoading(false);
        return { success: false, error: 'Authentication failed. No token received.' };
      }
    } catch (err) {
      console.error('Login error:', err);
      let errorMessage = 'An error occurred during login.';
      
      if (err.response) {
        // The request was made and the server responded with a status code
        errorMessage = err.response.data.message || 'Server responded with an error.';
      } else if (err.request) {
        // The request was made but no response was received
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
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
    // Disconnect socket first
    console.log('Disconnecting socket during logout');
    disconnectSocket();
    
    // Then remove auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    
    console.log('Logout complete, user session ended');
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