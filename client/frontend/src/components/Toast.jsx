import React, { useEffect } from 'react';
import './Toast.css';

/**
 * Toast notification component that auto-dismisses
 * @param {Object} props
 * @param {string} props.message - Message to display
 * @param {boolean} props.show - Whether the toast is visible
 * @param {function} props.onClose - Function to call when toast is closed
 * @param {string} props.type - Type of toast: 'success', 'error', 'info'
 * @param {number} props.duration - Duration in ms before auto-closing (default: 3000)
 */
const Toast = ({ message, show, onClose, type = 'info', duration = 3000 }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, onClose, duration]);

  if (!show) return null;

  return (
    <div className={`toast-container ${type}`}>
      <div className="toast-message">{message}</div>
    </div>
  );
};

export default Toast; 